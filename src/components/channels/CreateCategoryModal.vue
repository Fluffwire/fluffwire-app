<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useUiStore } from '@/stores/ui'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const route = useRoute()
const channelsStore = useChannelsStore()
const uiStore = useUiStore()

const categoryName = ref('')
const isLoading = ref(false)

const isOpen = computed({
  get: () => uiStore.activeModal === 'createCategory',
  set: (v) => { if (!v) uiStore.closeModal() },
})

async function handleCreate() {
  if (!categoryName.value.trim()) return
  isLoading.value = true
  try {
    await channelsStore.createCategory(
      route.params.serverId as string,
      categoryName.value.trim(),
    )
    toast.success('Category created')
    uiStore.closeModal()
    categoryName.value = ''
  } catch {
    toast.error('Failed to create category')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create Category</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <div class="space-y-2">
          <Label for="category-name">Category Name</Label>
          <Input
            id="category-name"
            v-model="categoryName"
            placeholder="e.g. General, Voice Channels"
            required
          />
        </div>

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">Cancel</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            Create Category
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
