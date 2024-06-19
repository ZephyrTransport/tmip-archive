<!-- TMIP Archive Vue Application
     Questions / PRs, contact Billy Charlton <mail@billyc.cc>
---------------------------------------------------------------- -->
<template>
  <p v-if="!db"><i>Loading TMIP database...</i></p>
  <div class="top-bar" v-show="db && showSearch">
    <h3>Search the TMIP email list archive</h3>

    <input
      class="input is-link"
      style="flex: 1"
      type="text"
      placeholder="Search..."
      v-model="searchTerm"
    />

    <h4>Advanced filters</h4>
    <div class="advanced-filters flex-row" style="gap: 0.25rem">
      <div class="flex1 flex-col advanced">
        <p>Sender</p>
        <input
          class="input is-link"
          style="flex: 1"
          type="text"
          placeholder="Name"
          v-model="author"
        />
      </div>
      <div class="flex1 flex-col advanced">
        <p>Subject</p>
        <input
          class="input is-link"
          style="flex: 1"
          type="text"
          placeholder="Subject"
          v-model="subject"
        />
      </div>
      <div class="flex1 flex-col advanced">
        <p>Start Date</p>
        <vue-date-picker
          v-model="dateFrom"
          :enable-time-picker="false"
          :auto-apply="true"
          format="yyyy-MM-dd"
        ></vue-date-picker>
      </div>
      <div class="flex1 flex-col advanced">
        <p>End Date</p>
        <vue-date-picker
          v-model="dateTo"
          :enable-time-picker="false"
          :auto-apply="true"
          format="yyyy-MM-dd"
        ></vue-date-picker>
      </div>
    </div>
  </div>

  <component :is="routerView" :results="results" :messages="currentMessages" :db="db" />

  <div v-show="db && showSearch">
    <hr />
    <p id="info-text" style="font-size: 14px">
      Messages from 2001-2023 are all in the archive database. Due to multiple server transitions
      over decades of operation, some individual messages may not appear in their threaded
      conversation. Those messages all still exist! -- but may require searching for the person's
      name or the message subject.
    </p>
    <hr />
  </div>
</template>

<script lang="ts">
const DB_PATH = '/tmip-archive-assets/tmip.db.zst'

import { defineComponent } from 'vue'
import { ZSTDDecoder } from 'zstddec'
import initSQL, { Database } from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'
import debounce from 'debounce'
import VueDatePicker from '@vuepic/vue-datepicker'

import SearchResultsView from './SearchResultsView.vue'
import MessageView from './MessageView.vue'
import WebinarsListView from './WebinarsListView.vue'
import WebinarView from './WebinarView.vue'

export default defineComponent({
  components: { WebinarsListView, WebinarView, SearchResultsView, MessageView, VueDatePicker },

  data() {
    return {
      results: [] as any[],
      db: null as null | Database,
      searchTerm: '',
      showSearch: true,
      debounceQuery: {} as any,
      debounceQuerySearchTerm: {} as any,
      currentPath: '',
      author: '',
      subject: '',
      dateFrom: null as null | Date,
      dateTo: null as null | Date,
      startDate: '',
      endDate: '',
    }
  },

  computed: {
    routerView() {
      if (!this.db) return SearchResultsView

      const path = this.currentPath.slice(1) || '/'

      this.showSearch = false

      if (path.indexOf('/webinar/') > -1) return WebinarView
      if (path.indexOf('/webinars') > -1) return WebinarsListView

      this.showSearch = true

      if (path.startsWith('/message')) return MessageView

      return SearchResultsView
    },

    currentMessages() {
      const path = this.currentPath.slice(1) || '/'
      if (!path.startsWith('/message')) return null

      // fetch individual message
      let message = path.slice(9)
      if (message.includes('?')) message = message.slice(0, message.indexOf('?'))

      const details = this.query('messages', { message })
      return details
    },
  },

  watch: {
    searchTerm() {
      this.results = []
      this.debounceQuerySearchTerm()
    },
    author() {
      this.results = []
      this.debounceQuerySearchTerm()
    },
    subject() {
      this.results = []
      this.debounceQuerySearchTerm()
    },
    dateFrom() {
      const date = this.dateFrom
      if (!date) {
        this.startDate = ''
      } else {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear().toString().padStart(2, '0')
        this.startDate = `${year}-${month}-${day}`
      }
      this.results = []
      this.debounceQuerySearchTerm()
    },
    dateTo() {
      const date = this.dateTo
      if (!date) {
        this.endDate = ''
      } else {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear().toString().padStart(2, '0')
        this.endDate = `${year}-${month}-${day}`
      }
      this.results = []
      this.debounceQuerySearchTerm()
    },
  },

  async mounted() {
    this.debounceQuery = debounce(this.query, 333)
    this.debounceQuerySearchTerm = debounce(this.getMessagesForSearchTerm, 333)

    const urlParams = new URLSearchParams(window.location.search)
    console.log(urlParams)

    this.currentPath = window.location.hash

    console.log(555, this.currentPath)

    window.addEventListener('hashchange', () => {
      console.log('PING!')
      this.currentPath = window.location.hash
      console.log(window.location.hash)
    })

    console.log('LOADING DATABASE--')
    const buffer = await this.fetchSqliteDatabase()
    this.db = await this.initializeDatabaseFromBuffer(buffer)
    console.log('--DONE LOADING DATABASE')

    // //tables
    // const query = this.db.exec("SELECT name FROM sqlite_master where type='table';");
    // const tables = query[0].values.flat();
    // console.log({ tables });
  },

  methods: {
    dateFormat(date: Date) {
      const day = date.getDate()
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      return `${year}-${month}-${day}`
    },

    convertQueryArrayToObject(response: any[]) {
      let json = [] as any

      if (response.length) {
        const columns = response[0].columns as string[]
        json = response[0].values.map((row: any[]) => {
          const obj = {} as any
          columns.forEach((col, i) => (obj[col] = row[i]))
          // scrub email addresses
          if (obj.from_field) {
            let email = obj.from_field as string
            let lt = email.indexOf('<')
            if (lt > -1) email = email.substring(0, lt)
            email = email.replaceAll('"', '').trim()
            obj.from_field = email
          }
          return obj
        })
      }
      return json
    },

    // this.debounceQuerySearchTerm('messages', { search: this.searchTerm })

    // getMessagesForSearchTerm(table: string, options?: any) {
    getMessagesForSearchTerm() {
      const table = 'messages'
      if (!this.db) return []

      // build options query
      let select = `SELECT rowid,* FROM ${table} WHERE `

      const terms = [] as string[]

      if (this.searchTerm) {
        terms.push(
          `(from_field LIKE '%${this.searchTerm}%'` + ` OR subject LIKE '%${this.searchTerm}%')`
        )
      }

      if (this.author) terms.push(`from_field LIKE '%${this.author}%'`)
      if (this.subject) terms.push(`subject LIKE '%${this.subject}%'`)
      if (this.startDate) terms.push(`date_timestamp > '${this.startDate}'`)
      if (this.endDate) terms.push(`date_timestamp < '${this.endDate}'`)

      const allTerms = terms.join(' AND ')
      const order = ` ORDER BY date_timestamp DESC;`

      let query = select + allTerms + order

      console.log(query)

      if (!allTerms.length && !this.searchTerm) return []

      const response = this.db.exec(query)

      const json = this.convertQueryArrayToObject(response)
      // max 250 responses
      const clipped = json.slice(0, 300)

      // if (options?.message) {
      //   return clipped
      // }

      // back to search results view. this is probably in the wrong place
      window.location.hash = '/'
      this.results = clipped
    },

    query(table: string, options?: any) {
      if (!this.db) return []

      let query = `SELECT rowid,* FROM ${table} ORDER BY date_timestamp ASC`

      if (options?.search && options.search !== '') {
        query =
          `SELECT rowid,* FROM ${table} WHERE` +
          ` from_field LIKE '%${options.search}%'` +
          ` OR subject LIKE '%${options.search}%'` +
          ` ORDER BY date_timestamp ASC`
      }

      if (options?.message && options.message !== '') {
        query = `SELECT rowid,* FROM ${table} WHERE rowid = '${options.message}'`
      }

      query += ';'

      const response = this.db.exec(query)

      let answer = [] as any
      if (response.length) {
        const columns = response[0].columns as string[]
        answer = response[0].values.map((row: any[]) => {
          const obj = {} as any
          columns.forEach((col, i) => (obj[col] = row[i]))

          // fix newlines __NL__
          if (obj.body) {
            obj.body = obj.body.replaceAll('__NL__', '<br/>')
            obj.body = obj.body.replaceAll(
              '#####################################################################',
              '###'
            )
            obj.body = obj.body.replaceAll(
              '************************************************************************',
              '***'
            )
          }

          // scrub email addresses
          if (obj.from_field) {
            let email = obj.from_field as string
            let lt = email.indexOf('<')
            if (lt > -1) email = email.substring(0, lt)
            email = email.replaceAll('"', '').trim()
            obj.from_field = email
          }
          return obj
        })
      }

      const clipped = answer.slice(0, 250)
      if (options?.message) {
        return clipped
      }

      // back to search results view. this is probably in the wrong place
      // this.currentPath = '/'; // window.location.hash;
      window.location.hash = '/'
      this.results = clipped
    },

    async initializeDatabaseFromBuffer(buffer: Uint8Array) {
      const SQL = await initSQL({
        // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
        // You can omit locateFile completely when running in node
        locateFile: () => sqlWasm,
      })

      const LOADED_DB = new SQL.Database(buffer)
      return LOADED_DB
    },

    async fetchSqliteDatabase() {
      // initialize ZSTD decompressor
      const decoder = new ZSTDDecoder()
      await decoder.init()

      // fetch & uncompress archive
      const archive = await (await fetch(DB_PATH)).arrayBuffer()
      const buffer = decoder.decode(new Uint8Array(archive))

      return buffer
    },
  },
})
</script>

<style>
/* @import './css/zephyr-2020.css';
@import './css/landing-page.css'; */

@import './css/style.css';

@import '@vuepic/vue-datepicker/dist/main.css';
</style>
