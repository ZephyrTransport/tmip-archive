<!-- TMIP Archive Vue Application
     Questions / PRs, contact Billy Charlton <mail@billyc.cc>
     ---------------------------------------------------- -->

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { Database } from 'sql.js';

export default defineComponent({
  props: {
    db: { type: Object as PropType<Database>, required: true },
    messages: Array<any>,
  },

  data() {
    return {
      results: [] as any[],
      searchTerm: '',
    };
  },

  computed: {},

  async mounted() {},

  watch: {},

  methods: {
    query(table: string, options?: any) {
      if (!this.db) return [];

      let query = `SELECT * FROM ${table} WHERE id = '${options.message}'`;
      console.log(query);

      const response = this.db.exec(query);
      const columns = response[0].columns as string[];
      const answer = response[0].values.map((row: any[]) => {
        const obj = {} as any;
        columns.forEach((col, i) => (obj[col] = row[i]));
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

      const clipped = answer.slice(0, 100);
      console.log(clipped);

      if (options?.message) return clipped;
      this.results = clipped;
    },
  },
});
</script>

<template>
  <div class="message-panel">
    <div v-for="row in messages">
      <p v-html="row.body"></p>
      <!-- <p v-html="row.body.replaceAll('    ', '<br/><br/>')"></p> -->
    </div>
  </div>
</template>
