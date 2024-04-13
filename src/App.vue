<script lang="ts">
// TMIP Archive Vue Application
// Questions / PRs, contact Billy Charlton <mail@billyc.cc>
// ----------------------------------------------------------------

// ZSTD archive decompressor (database is compressed)
import { ZSTDDecoder } from 'zstddec';
import { defineComponent } from 'vue';

const DB_PATH = '/tmip.db.zst';

export default defineComponent({
  data() {
    return {
      count: 0,
      db: {},
    };
  },

  mounted() {
    // this happens async
    this.db = this.fetchSqliteDatabase();
  },

  methods: {
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
