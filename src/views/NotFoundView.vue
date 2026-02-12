<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="text-center">
    <h1 class="mb-2 text-6xl font-bold text-text-primary">404</h1>
    <p class="mb-6 text-lg text-text-secondary">Page not found</p>
    <BaseButton @click="router.push('/channels/@me')">Go Home</BaseButton>
  </div>
</template>
