<script lang="ts">
// TMIP Archive Vue Application
// Questions / PRs, contact Billy Charlton <mail@billyc.cc>
// ----------------------------------------------------------------

const DB_PATH = '/tmip.db.zst';

import { defineComponent } from 'vue';
import { ZSTDDecoder } from 'zstddec';
import initSQL from 'sql.js';

import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url';

console.log({ initSQL });

export default defineComponent({
  data() {
    return {
      count: 0,
      db: null as null | Buffer,
    };
  },

  async mounted() {
    // this happens async
    const buffer = await this.fetchSqliteDatabase();
    this.initializeDatabaseFromBuffer(buffer);
  },

  methods: {
    async initializeDatabaseFromBuffer(buffer: any) {
      const SQL = await initSQL({
        // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
        // You can omit locateFile completely when running in node
        locateFile: () => sqlWasm,
      });

      const LOADED_DB = new SQL.Database(buffer);
      console.log({ LOADED_DB });

      const response = LOADED_DB.exec('SELECT * FROM webinars;');
      console.log({ response });
    },

    async fetchSqliteDatabase() {
      // initialize ZSTD decompressor
      const decoder = new ZSTDDecoder();
      await decoder.init();

      // fetch & uncompress archive
      const archive = await (await fetch(DB_PATH)).arrayBuffer();
      console.log({ archive });
      const buffer = decoder.decode(new Uint8Array(archive));
      console.log('BUFFER bytes', buffer.byteLength);

      this.count++;

      // Set up SQLite database from buffer

      return buffer;
    },
  },
});
</script>

<template>
  <div>count is {{ count }}</div>
</template>
