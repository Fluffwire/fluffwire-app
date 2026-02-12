<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <div class="text-center">
    <h1 class="mb-2 text-6xl font-bold text-foreground">404</h1>
    <p class="mb-6 text-lg text-muted-foreground">Page not found</p>
    <Button @click="router.push('/channels/@me')">
      <Home class="mr-2 h-4 w-4" />
      Go Home
    </Button>
  </div>
</template>
