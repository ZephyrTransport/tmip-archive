<!-- TMIP Archive Vue Application
     Questions / PRs, contact Billy Charlton <mail@billyc.cc>
     ---------------------------------------------------- -->
<template>
  <div class="webinar-panel" v-if="webinar">
    <a href="#/webinars"><p>&laquo; Back to webinar list</p></a>

    <div class="webinar-card" style="margin-bottom: 2rem; background-color: #56e; color: white">
      <h3>{{ webinar.subject }}</h3>
      <h4 v-if="webinar.author">{{ webinar.author}}</h4>

      <h4>
        <b>{{ webinar.date_timestamp.substring(0, 10).replaceAll('-','. ') }}</b>
        <span v-if="webinar.category"> &raquo; {{ webinar.category }}</span>
        <span> &raquo; Webinar {{ webinar.rowid }}</span>
      </h4>

    </div>

    <p class="webinar-body" v-html="cleanBody"></p>

    <div class="attachment-panel" v-if="webinar.attachments?.length">
      <h3>Attachments:</h3>
      <div v-for="attachment,i in webinar.attachments">
        <a target="_blank" :href="attach_base_url + attachment">Attachment {{i+1}}:  {{ attachment.substring(1 + attachment.lastIndexOf('/')) }}</a>
      </div>
    </div>
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
      attach_base_url: ATTACH_RAW_URL,
      hash: '',
      webinar: null as any,
    }
  },

  computed: {
    cleanBody() {
      let body = this.webinar.body as string

      // strip formatting
      body = body
        .replaceAll('font-size:', 'xfont-size:')
        .replaceAll('font-weight:', 'xfont-weight:')
        .replaceAll('font-family:', 'xfont-family:')
        .replaceAll('color:', 'xcolor:')
        .replaceAll('background-color:', 'xbackground-color:')

      return body

      // re-link raw links -- skip for now, buggy
      console.log({ body })
      const urlPattern = /([^"](http|https):\/\/[^\s,<>"]+)/g
      const fixed = body.replace(urlPattern, raw => {
        const prefix = raw.substring(0, 1)
        const url = raw.substring(1)
        console.log(1, raw)
        return `${prefix}<a href="${url}">${url}</a>`
      })
      console.log({ fixed })
      return fixed
    },
  },

  async mounted() {
    const hash = window.location.hash
    const idx = hash.indexOf('/webinar/')
    if (idx > -1) this.hash = hash.substring(idx + 9)

    this.getWebinar()
  },

  methods: {
    async getWebinar() {
      console.log('hash', this.hash)
      const webinars = await this.query('webinars', { rowid: this.hash })

      // add author and attachments
      let authorsAttachments = (await this.query('webinar_authors_attachments', {rowid: this.hash})) as any[]
      let lookup = {} as any
      for (const row of authorsAttachments) lookup[row.webinar] = row
      for (const webinar of webinars)      {
        if (lookup[webinar.rowid]) {
          webinar.author = lookup[webinar.rowid].Author || ''
          webinar.attachments = []
          for (let i=1; i < 9; i++) {
            const attachFilename = lookup[webinar.rowid][`Attachment${i}`]
            if (attachFilename) {
              // we got an attachment filename! Great!
              // But now we need to clean it up because they are inconsistent :-/
              let filename = attachFilename
              if (attachFilename.startsWith('/webinars/')) filename = attachFilename.substring(9)
              if (attachFilename.startsWith('/files/webinar/')) filename = attachFilename.substring(14)
              if (attachFilename.startsWith('/files/webinars/')) filename = attachFilename.substring(15)
              if (attachFilename.startsWith('TMIP/webinars/')) filename = attachFilename.substring(13)
              webinar.attachments.push(filename)
            }
          }
        }
      }

      console.log({ webinars })

      if (webinars) this.webinar = webinars[0]

      // scroll to top
      window.scrollTo(0, 0)
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

      const keys = Object.keys(options) || []
      const wheres = keys.map(key => `${key} = '${options[key]}'`)
      const whereClause = wheres.join(' OR ')
      let query = `SELECT rowid,* FROM ${table}`
      if (whereClause) query += ` WHERE ${whereClause}`
      query += ';'

      console.log(query)

      let response = this.db.exec(query)
      const json = this.convertQueryArrayToObject(response)
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

          // fix attachment URLs
          if (obj.body) {
            obj.body = obj.body.replaceAll('target="blank"', 'target="_blank"')
            obj.body = obj.body.replaceAll(
              '/sites/freightmodelimprovementprogram.localhost/files/webinars/',
              'https://github.com/ZephyrTransport/tmip-archive/raw/main/public/webinars/'
            )
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

<style scoped>
h4 {
   color: white;
   margin-bottom: 1rem;
}
</style>