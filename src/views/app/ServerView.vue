<script setup lang="ts">
import { Hash } from 'lucide-vue-next'
</script>

<template>
  <div class="flex h-full items-center justify-center text-muted-foreground">
    <div class="text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Hash class="h-8 w-8 text-primary" />
      </div>
      <h3 class="text-lg font-semibold text-foreground">Welcome to the server!</h3>
      <p class="mt-1">Select a channel from the sidebar to get started.</p>
    </div>
  </div>
</template>
