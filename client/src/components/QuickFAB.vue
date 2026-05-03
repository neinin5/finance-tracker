<script setup>
import { useUiStore } from '../stores/ui'
const ui = useUiStore()
</script>

<template>
  <button
    class="fab"
    @click="ui.openAddModal"
    title="Add expense (N)"
    aria-label="Add expense"
  >
    +
  </button>
</template>
