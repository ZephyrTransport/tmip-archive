<!-- TMIP Archive Vue Application
     Questions / PRs, contact Billy Charlton <mail@billyc.cc>
     ---------------------------------------------------- -->

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    results: Array<any>,
  },
});
</script>

<template>
  <div class="results-table">
    <div v-for="row in results" class="results-row">
      <div class="row-date">{{ row.date.split(' ')[0] }}</div>
      <div>
        <div class="row-subject">
          <a :href="`#/message/${row.id}`"> {{ row.subject }} </a>
        </div>
        <div class="row-from">{{ row.from_field }}</div>
      </div>
    </div>
  </div>
</template>
