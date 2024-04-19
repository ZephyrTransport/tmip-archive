<script lang="ts">
// TMIP Archive Vue Application
// Questions / PRs, contact Billy Charlton <mail@billyc.cc>
// ----------------------------------------------------------------

const DB_PATH = '/tmip-archive-assets/tmip.db.zst';

import { defineComponent } from 'vue';
import { ZSTDDecoder } from 'zstddec';
import initSQL, { Database } from 'sql.js';
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url';
import debounce from 'debounce';

import SearchResultsView from './SearchResultsView.vue';
import MessageView from './MessageView.vue';

export default defineComponent({
  components: { SearchResultsView, MessageView },

  data() {
    return {
      results: [] as any[],
      db: null as null | Database,
      searchTerm: '',
      debounceQuery: {} as any,
      debounceQuerySearchTerm: {} as any,
      currentPath: '',
    };
  },

  computed: {
    routerView() {
      console.log('11');
      const path = this.currentPath.slice(1) || '/';

      console.log('12', path);
      if (path.startsWith('/message')) return MessageView;
      return SearchResultsView;
    },

    currentMessages() {
      const path = this.currentPath.slice(1) || '/';
      console.log({ path });
      if (!path.startsWith('/message')) return null;
      let message = path.slice(9);
      console.log({ message });
      if (message.includes('?')) message = message.slice(0, message.indexOf('?'));

      const details = this.query('messages', { message });
      return details;
    },
  },

  watch: {
    searchTerm() {
      this.results = [];
      this.debounceQuerySearchTerm('messages', { search: this.searchTerm });
    },
  },

  async mounted() {
    this.debounceQuery = debounce(this.query, 333);
    this.debounceQuerySearchTerm = debounce(this.getMessagesForSearchTerm, 333);

    const urlParams = new URLSearchParams(window.location.search);
    console.log(urlParams);

    this.currentPath = window.location.hash;
    window.addEventListener('hashchange', () => {
      console.log('PING!');
      this.currentPath = window.location.hash;
      console.log(window.location.hash);
    });

    console.log('LOADING DATABASE--');
    const buffer = await this.fetchSqliteDatabase();
    this.db = await this.initializeDatabaseFromBuffer(buffer);
    console.log('--DONE LOADING DATABASE');

    //tables
    const query = this.db.exec("SELECT name FROM sqlite_master where type='table';");
    const tables = query[0].values.flat();
    console.log({ tables });

    // initial view

    // this.query('messages');
    // const messages = this.query('messages');
    // console.log({ messages });
    // this.results = messages.slice(0, 100);
  },

  methods: {
    convertQueryArrayToObject(response: any[]) {
      let json = [] as any;

      if (response.length) {
        const columns = response[0].columns as string[];
        json = response[0].values.map((row: any[]) => {
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
      }
      return json;
    },

    getMessagesForSearchTerm(table: string, options?: any) {
      console.log('GET THREADS', table, options);
      if (!this.db) return [];

      let query =
        `SELECT rowid,* FROM ${table} WHERE` +
        ` from_field LIKE '%${options.search}%'` +
        ` OR subject LIKE '%${options.search}%'` +
        ` ORDER BY date_timestamp ASC;`;

      console.log(query);
      const response = this.db.exec(query);

      const json = this.convertQueryArrayToObject(response);
      const clipped = json.slice(0, 100);
      console.log(clipped);

      console.log(333, options);
      if (options?.message) return clipped;

      // back to search results view. this is probably in the wrong place
      window.location.hash = '/';
      this.results = clipped;
    },

    query(table: string, options?: any) {
      console.log(1000, table, options);
      if (!this.db) return [];

      let query = `SELECT rowid,* FROM ${table} ORDER BY date_timestamp ASC`;

      if (options?.search && options.search !== '') {
        query =
          `SELECT rowid,* FROM ${table} WHERE` +
          ` from_field LIKE '%${options.search}%'` +
          ` OR subject LIKE '%${options.search}%'` +
          ` ORDER BY date_timestamp ASC`;
      }

      if (options?.message && options.message !== '') {
        query = `SELECT rowid,* FROM ${table} WHERE rowid = '${options.message}'`;
      }

      query += ';';

      console.log(query);
      const response = this.db.exec(query);

      let answer = [] as any;
      if (response.length) {
        const columns = response[0].columns as string[];
        answer = response[0].values.map((row: any[]) => {
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
      const clipped = answer.slice(0, 100);
      console.log(clipped);

      console.log(333, options);
      if (options?.message) return clipped;

      // back to search results view. this is probably in the wrong place
      // this.currentPath = '/'; // window.location.hash;
      window.location.hash = '/';
      this.results = clipped;
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

  <component :is="routerView" :results="results" :messages="currentMessages" :db="db" />
</template>

<style scoped>
@import './style.css';
</style>
