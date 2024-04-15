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
      // results: [] as any[],
      // searchTerm: '',
    };
  },

  computed: {},

  async mounted() {
    this.findAttachments();
  },

  watch: {
    messages() {
      this.findAttachments();
    },
  },

  methods: {
    async findAttachments() {
      console.log('A');
      if (!this.messages?.length) return;
      console.log('B');

      for (const row of this.messages) {
        console.log('C', row);
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

    query(table: string, options?: any) {
      if (!this.db) return [];

      let query = `SELECT * FROM ${table} WHERE post_id = '${options.post_id}'`;
      console.log(query);

      const response = this.db.exec(query);
      const columns = response[0].columns as string[];
      const answer = response[0].values.map((row: any[]) => {
        const obj = {} as any;
        columns.forEach((col, i) => (obj[col] = row[i]));
        return obj;
      });

      return answer;
    },
  },
});
</script>

<template>
  <div class="message-panel">
    <div v-for="row in messages">
      <div class="flex">
        <div style="width: 4rem">Subject:</div>
        <b>{{ row.subject }}</b>
      </div>
      <div class="flex">
        <div style="width: 4rem">From:</div>
        <b>{{ row.from_field }}</b>
      </div>
      <div class="flex">
        <div style="width: 4rem">Sent:</div>
        <b>{{ row.date_timestamp }}</b>
      </div>

      <hr />
      <p v-html="row.body"></p>
      <!-- <p v-html="row.body.replaceAll('    ', '<br/><br/>')"></p> -->
      <div class="attachment-panel" v-if="row.attachments">
        <h3>Attachments:</h3>
        <div v-for="attachment in row.attachments">
          <a :href="attachment.url">{{ attachment.filename }}</a>
        </div>
      </div>
    </div>
  </div>
</template>
