<!-- TMIP Archive Vue Application
     Questions / PRs, contact Billy Charlton <mail@billyc.cc>
     ---------------------------------------------------- -->
<template>
  <div class="webinar-panel">
    <a href="/TMIP"><p>&laquo; Back to TMIP</p></a>
    <h1>TMIP WEBINARS</h1>

    <p>This is the complete list of archived TMIP webinars from 2007-2023.</p>

    <h4>Search:</h4>
    <input
      class="input is-link"
      style="flex: 1; margin-left: 1rem;"
      type="text"
      placeholder="title, presenter, keywords..."
      v-model="currentSearchTerm"
    />

    <h4>Year:</h4>
    <div class="year-list">
      <button
        v-for="year in years"
        :class="{ 'is-active': year == currentYear }"
        @click="currentYear = year"
      >
        {{ ` ${year} ` }}
      </button>
    </div>

    <h4>Category:</h4>
    <div class="webinar-categories">
      <button
        v-for="(category, i) in categories"
        :key="category"
        v-html="category"
        :class="{ 'is-active': currentCategory == i }"
        @click="currentCategory = i"
      ></button>
    </div>

    <h4>Webinars:</h4>
    <div class="webinar-table">
      <div class="flex-row webinar-card" style="gap: 0.5rem">
          <p style="flex: 1">Date</p>
          <p style="flex: 5">Title</p>
          <p style="flex: 2">Presenter</p>
      </div>
      <div v-for="row in webinars" :key="row.rowid" class="webinar-card">
        <div class="flex-row" style="gap: 1rem" >
          <div class="flex-col flex1" style="margin-top: 2px;">
            <p><b>{{ row.date_timestamp.substring(0, 10).replaceAll('-','.') }}</b></p>
            <p style="font-size: 13px">Webinar {{ row.rowid }}</p>
          </div>

          <div class="flex-col" style="flex: 5">
            <p><a :href="`#/webinar/${row.rowid}`">{{ row.subject }}</a></p>
            <p v-if="row.category" style="color: #555; font-size: 13px" >{{ row.category }}</p>
          </div>

          <div class="flex-col" style="flex: 2">
            <p>{{ row.author || '&nbsp;' }}</p>
          </div>

        </div>
      </div>
    </div>
    <p v-show="!webinars.length"><i>&nbsp;&nbsp;No webinars match your current filters.</i></p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { Database } from 'sql.js'

const ATTACH_RAW_URL = 'https://github.com/ZephyrTransport/tmip-archive/raw/main/public/webinars'

export default defineComponent({
  props: {
    db: { type: Object as PropType<Database> },
    messages: Array<any>,
  },

  data() {
    return {
      webinars: [] as any[],
      years: [...Array(17).keys()].reverse().map(n => n + 2007) as any[],
      currentYear: 'All' as any,
      currentCategory: 0,
      currentSearchTerm: '',
      categories: [
        'All',
        'Activity Based Modeling',
        'Dynamic Traffic<br/>Assignment (DTA)',
        'Land Use Modeling',
        'Model Validation,<br/>Verification and Checking',
        'Exploratory Modeling<br/>and Simulation',
        'Strategic and<br/>Sketch Modeling',
        'Traditional and<br/>Emerging Data',
        'Travel Model<br/>Development',
      ],
      // results: [] as any[],
      // searchTerm: '',
    }
  },

  computed: {},

  async mounted() {
    this.years.unshift('All')
    console.log(this.years)
    this.listWebinars()
  },

  watch: {
    currentCategory() {
      this.listWebinars()
    },
    currentYear() {
      this.listWebinars()
    },
    currentSearchTerm() {
      this.listWebinars()
    },
  },

  methods: {

    async listWebinars() {
      // filter on category
      let category = this.categories[this.currentCategory]
      category = category.replaceAll('<br/>', ' ')

      const filter = {} as any
      if (category !== 'All') filter.category = category
      if (this.currentSearchTerm) filter.search = this.currentSearchTerm

      let webinars = (await this.query('webinars', filter)) as any[]

      if (this.currentYear !== 'All') {
        webinars = webinars.filter(w => w.date_timestamp.startsWith(this.currentYear))
      }

      webinars.sort((a, b) => (a.date_timestamp < b.date_timestamp ? 1 : -1))

      // add authors from joe's table
      let authorsAttachments = (await this.query('webinar_authors_attachments', {})) as any[]
      let lookup = {} as any
      for (const row of authorsAttachments) lookup[row.webinar] = row
      for (const webinar of webinars)      {
        if (lookup[webinar.rowid]) {
          webinar.author = lookup[webinar.rowid].Author || ''
          // skip attachments on list page---
          // webinar.attachments = []
          // for (let i=1; i < 9; i++) {
          //   const attachFilename = lookup[webinar.rowid][`Attachment${i}`]
          //   if (attachFilename) webinar.attachments.push(attachFilename)
          // }
        }
      }

      if (webinars) this.webinars = webinars
    },

    async findAttachments() {
      if (!this.messages?.length) return

      for (const row of this.messages) {
        const post_id = row.message_id || row.id
        const attachments = this.query('message_attachments', { post_id })
        const withURLs = attachments.map((a: any) => {
          const att = {
            url: `${ATTACH_RAW_URL}/${a.attachment_filename}`,
            filename: a.attachment_filename,
          }
          return att
        })
        console.log({ withURLs })
        row.attachments = withURLs
      }
    },

    query(table: string, options?: any) {
      if (!this.db) return []

      const { search, ...details} = options

      let wheres = [] as any[]

      //TODO add presenter
      if (search) {
        wheres.push(`(subject LIKE '%${search}%' OR body LIKE '%${search}%')`)
      }

      const keys = Object.keys(details) || []
      if (keys.length) {
        wheres.push(keys.map(key => `${key} = '${details[key]}'`) )
        wheres = wheres.flat()
      }

      const whereClause = wheres.join(' AND ')
      let query = `SELECT rowid,* FROM ${table}`
      if (whereClause) query += ` WHERE ${whereClause}`
      query += ';'

      console.log(query)

      let response = this.db.exec(query)

      let json = this.convertQueryArrayToObject(response)
      // json = json.filter((webinar: any) => !!webinar.subject)

      console.log({ json })

      return json
    },

    convertQueryArrayToObject(response: any[]) {
      let json = [] as any

      if (response.length) {
        const columns = response[0].columns as string[]
        json = response[0].values.map((row: any[]) => {
          const obj = {} as any
          columns.forEach((col, i) => (obj[col] = row[i]))

          // fix newlines __NL__
          if (obj.body) {
            obj.body = obj.body.replaceAll('__NL__', '<br/>')
          }

          // scrub email addresses
          if (obj.from_field) {
            let email = obj.from_field as string
            let lt = email.indexOf('<')
            if (lt > -1) email = email.substring(0, lt)
            if (email.replaceAll) email = email.replaceAll('"', '').trim()
            obj.from_field = email
          }
          return obj
        })
      }
      return json
    },
  },
})
</script>
