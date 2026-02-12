<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'

const route = useRoute()
const layout = computed(() => route.meta.layout as string)
</script>

<template>
  <template v-if="layout === 'settings'">
    <RouterView />
  </template>
  <component v-else :is="layout === 'app' ? AppLayout : AuthLayout">
    <RouterView />
  </component>
  <ToastContainer />
</template>
