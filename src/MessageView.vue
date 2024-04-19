<!-- TMIP Archive Vue Application
     Questions / PRs, contact Billy Charlton <mail@billyc.cc>
     ---------------------------------------------------- -->

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { Database } from 'sql.js';

const ATTACH_RAW_URL =
  'https://github.com/ZephyrTransport/tmip-archive/raw/main/public/attachments';

export default defineComponent({
  props: {
    db: { type: Object as PropType<Database> },
    messages: Array<any>,
  },

  data() {
    return {
      threadMessages: [] as any[],
      // results: [] as any[],
      // searchTerm: '',
    };
  },

  computed: {},

  async mounted() {
    this.findAttachments();
    this.getThread();
  },

  watch: {
    messages() {
      this.findAttachments();
      this.getThread();
    },
  },

  methods: {
    async findAttachments() {
      if (!this.messages?.length) return;

      for (const row of this.messages) {
        const post_id = row.message_id || row.id;
        const attachments = this.query('message_attachments', { post_id });
        const withURLs = attachments.map((a: any) => {
          const att = {
            url: `${ATTACH_RAW_URL}/${a.attachment_filename}`,
            filename: a.attachment_filename,
          };
          return att;
        });
        console.log({ withURLs });
        row.attachments = withURLs;
      }
    },

    async getThread() {
      console.log('FIND THREAD');
      if (!this.messages?.length) return;

      const message = this.messages[0];
      console.log({ message });
      console.log(message.thread);

      const threadMessages = this.query('messages', { thread: message.thread });
      console.log({ threadMessages });

      this.threadMessages = threadMessages;
    },

    query(table: string, options?: any) {
      if (!this.db) return [];

      const keys = Object.keys(options) || [];
      const wheres = keys.map(key => `${key} = '${options[key]}'`);
      const whereClause = wheres.join(' OR ');
      let query = `SELECT rowid,* FROM ${table} WHERE ${whereClause};`;
      console.log(query);

      let response = this.db.exec(query);
      const json = this.convertQueryArrayToObject(response);
      console.log({ json });
      return json;
    },

    convertQueryArrayToObject(response: any[]) {
      let json = [] as any;

      if (response.length) {
        const columns = response[0].columns as string[];
        json = response[0].values.map((row: any[]) => {
          const obj = {} as any;
          columns.forEach((col, i) => (obj[col] = row[i]));

          // fix newlines __NL__
          if (obj.body) {
            obj.body = obj.body.replaceAll('__NL__', '<br/>');
          }

          // scrub email addresses
          if (obj.from_field) {
            let email = obj.from_field as string;
            let lt = email.indexOf('<');
            if (lt > -1) email = email.substring(0, lt);
            email = email.replaceAll('"', '').trim();
            obj.from_field = email;
          }
          return obj;
        });
      }
      return json;
    },
  },
});
</script>

<template>
  <div class="message-panel">
    <div class="message-pane">
      <div v-for="row in messages">
        <div class="flex">
          <div style="width: 4rem; margin-right: 0.25rem">Subject:</div>
          <b>{{ row.subject }}</b>
        </div>
        <div class="flex">
          <div style="width: 4rem; margin-right: 0.25rem">From:</div>
          <b>{{ row.from_field }}</b>
        </div>
        <div class="flex">
          <div style="width: 4rem; margin-right: 0.25rem">Sent:</div>
          <b>{{ row.date_timestamp }}</b>
        </div>

        <hr />

        <p v-html="row.body"></p>
        <!-- <p v-html="row.body.replaceAll('    ', '<br/><br/>')"></p> -->
        <div class="attachment-panel" v-if="row.attachments?.length">
          <h3>Attachments:</h3>
          <div v-for="attachment in row.attachments">
            <a :href="attachment.url">{{ attachment.filename }}</a>
          </div>
        </div>
      </div>
    </div>

    <div class="thread" v-if="threadMessages.length">
      <p style="margin-bottom: 0.5rem; font-weight: bold; text-transform: uppercase">Thread:</p>
      <div
        v-for="(message, i) in threadMessages"
        class="thread-message"
        :style="{
          marginLeft: !!i ? '0.75rem' : '',
          backgroundColor: message.rowid == (messages && messages[0].rowid) ? '#cfd' : '',
        }"
      >
        <a :href="`#/message/${message.rowid}`">
          {{ message.from_field }}
          <span v-if="i == 0"><br />{{ message.date_timestamp }}</span>
          <br /><span style="color: #88b">{{ message.subject }}</span>
        </a>
      </div>
    </div>
  </div>
</template>
