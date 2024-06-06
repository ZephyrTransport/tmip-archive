<!-- TMIP Archive Vue Application
     Questions / PRs, contact Billy Charlton <mail@billyc.cc>
     ---------------------------------------------------- -->
<template>
  <div class="webinar-panel">
    <a href="/TMIP"><p>&laquo; Back to TMIP</p></a>
    <h1>TMIP WEBINARS</h1>

    <p>This is the complete list of archived TMIP webinars from 2007-2023.</p>

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

    <div class="webinar-table">
      <div v-for="row in webinars" :key="row.rowid" class="webinar-card" :style="getCardColor()">
        <a :href="`#/webinar/${row.rowid}`">
          <h3>{{ row.subject }}</h3>

          <div style="display: flex; padding: 0 0.25rem; color: #555">
            <span style="flex: 1">Webinar {{ row.rowid }}</span>
            <span>{{ row.date_timestamp.substring(0, 10) }}</span>
          </div>
          <p style="color: #555; font-size: 12px" v-if="row.category">{{ row.category }}</p>
        </a>
      </div>
    </div>
    <p v-show="!webinars.length"><i>&nbsp;&nbsp;No webinars match your current filters.</i></p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { Database } from 'sql.js'

const ATTACH_RAW_URL = 'https://github.com/ZephyrTransport/tmip-archive/raw/main/public/attachments'

export default defineComponent({
  props: {
    db: { type: Object as PropType<Database> },
    messages: Array<any>,
  },

  data() {
    return {
      webinars: [] as any[],
      threadMessages: [] as any[],
      years: [...Array(17).keys()].reverse().map(n => n + 2007) as any[],
      currentYear: 'All' as any,
      currentCategory: 0,
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
    messages() {
      this.findAttachments()
      this.getThread()
    },
    currentCategory() {
      this.listWebinars()
    },
    currentYear() {
      this.listWebinars()
    },
  },

  methods: {
    getCardColor() {
      return {
        backgroundColor: '#eeeef6',
      }
    },

    async listWebinars() {
      // filter on category
      let category = this.categories[this.currentCategory]
      category = category.replaceAll('<br/>', ' ')

      const filter = {} as any
      if (category !== 'All') filter.category = category

      let webinars = (await this.query('webinars', filter)) as any[]

      if (this.currentYear !== 'All') {
        webinars = webinars.filter(w => w.date_timestamp.startsWith(this.currentYear))
      }

      webinars.sort((a, b) => (a.date_timestamp < b.date_timestamp ? 1 : -1))
      console.log({ webinars })

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

    async getThread() {
      console.log('FIND THREAD')
      if (!this.messages?.length) return

      const message = this.messages[0]
      console.log({ message })
      console.log(message.thread)

      const threadMessages = this.query('messages', { thread: message.thread })
      console.log({ threadMessages })

      this.threadMessages = threadMessages

      // scroll to top if on mobile
      if (window.matchMedia('(max-width: 640px)').matches) {
        window.scrollTo(0, 400)
      }
    },

    query(table: string, options?: any) {
      console.log(1)
      if (!this.db) return []
      console.log(2)

      const keys = Object.keys(options) || []
      const wheres = keys.map(key => `${key} = '${options[key]}'`)
      const whereClause = wheres.join(' OR ')
      let query = `SELECT rowid,* FROM ${table}`
      if (whereClause) query += ` WHERE ${whereClause}`
      query += ';'

      console.log(query)

      let response = this.db.exec(query)
      console.log({ response })
      let json = this.convertQueryArrayToObject(response)
      json = json.filter((webinar: any) => !!webinar.subject)
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
