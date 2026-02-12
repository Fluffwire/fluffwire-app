<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { Toaster } from '@/components/ui/sonner'

const route = useRoute()
const layout = computed(() => route.meta.layout as string)
</script>

<template>
  <component :is="layout === 'app' ? AppLayout : AuthLayout">
    <RouterView />
  </component>
  <Toaster position="bottom-right" :theme="'dark'" rich-colors />
</template>
