<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useUiStore } from '@/stores/ui'
import type { ChannelCategory } from '@/types'
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
  get: () => uiStore.activeModal === 'editCategory',
  set: (v) => { if (!v) uiStore.closeModal() },
})

const category = computed(() => uiStore.modalData as ChannelCategory | null)

watch(isOpen, (open) => {
  if (open && category.value) {
    categoryName.value = category.value.name
  }
})

async function handleSave() {
  if (!category.value || !categoryName.value.trim()) return
  isLoading.value = true
  try {
    await channelsStore.updateCategory(
      route.params.serverId as string,
      category.value.id,
      categoryName.value.trim(),
    )
    toast.success('Category updated')
    uiStore.closeModal()
  } catch {
    toast.error('Failed to update category')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Category</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="space-y-2">
          <Label for="edit-category-name">Category Name</Label>
          <Input
            id="edit-category-name"
            v-model="categoryName"
            placeholder="Category name"
            required
          />
        </div>

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">Cancel</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
