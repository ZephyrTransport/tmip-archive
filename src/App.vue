<script lang="ts">
// TMIP Archive Vue Application
// Questions / PRs, contact Billy Charlton <mail@billyc.cc>
// ----------------------------------------------------------------

const DB_PATH = '/tmip.db.zst';

import { defineComponent } from 'vue';
import { ZSTDDecoder } from 'zstddec';
import initSQL, { Database } from 'sql.js';
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url';
import debounce from 'debounce';

export default defineComponent({
  data() {
    return {
      results: [] as any[],
      db: null as null | Database,
      searchTerm: '',
      debounceQuery: {} as any,
    };
  },

  async mounted() {
    this.debounceQuery = debounce(this.query, 333);

    const buffer = await this.fetchSqliteDatabase();
    this.db = await this.initializeDatabaseFromBuffer(buffer);

    //tables
    const query = this.db.exec("SELECT name FROM sqlite_master where type='table';");
    const tables = query[0].values.flat();
    console.log({ tables });

    // test
    this.query('messages');
    // const messages = this.query('messages');
    // console.log({ messages });
    // this.results = messages.slice(0, 100);
  },

  watch: {
    searchTerm() {
      this.debounceQuery('messages', { search: this.searchTerm });
    },
  },

  methods: {
    query(table: string, options?: any) {
      if (!this.db) return [];

      let query = `SELECT * FROM ${table}`;

      if (options?.search && options.search !== '') {
        query = `SELECT * FROM ${table} WHERE from_field LIKE '%${options.search}%'`;
      }

      query += ';';

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

      this.results = answer.slice(0, 100);
    },

    async initializeDatabaseFromBuffer(buffer: Uint8Array) {
      const SQL = await initSQL({
        // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
        // You can omit locateFile completely when running in node
        locateFile: () => sqlWasm,
      });

      const LOADED_DB = new SQL.Database(buffer);
      return LOADED_DB;
    },

    async fetchSqliteDatabase() {
      // initialize ZSTD decompressor
      const decoder = new ZSTDDecoder();
      await decoder.init();

      // fetch & uncompress archive
      const archive = await (await fetch(DB_PATH)).arrayBuffer();
      const buffer = decoder.decode(new Uint8Array(archive));
      console.log('DB BUFFER bytes', buffer.byteLength);

      return buffer;
    },
  },
});
</script>

<template>
  <div class="top-bar">
    <input
      class="input is-link"
      style="flex: 1"
      type="text"
      placeholder="Search..."
      v-model="searchTerm"
    />
    <button class="button is-link">Search</button>
  </div>
  <div class="results-table">
    <div v-for="row in results" class="results-row">
      <div class="row-date">{{ row.date.split(' ')[0] }}</div>
      <div>
        <div class="row-subject">{{ row.subject }}</div>
        <div class="row-from">{{ row.from_field }}</div>
      </div>
    </div>
  </div>
</template>
