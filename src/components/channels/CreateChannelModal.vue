<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useChannelsStore } from '@/stores/channels'
import { useUiStore } from '@/stores/ui'
import { AccessModeLabels, AccessModeDescriptions } from '@/constants/channelAccess'
import type { ChannelType, ChannelAccessMode } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Hash, Headphones } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const route = useRoute()
const channelsStore = useChannelsStore()
const uiStore = useUiStore()

const channelName = ref('')
const channelType = ref<ChannelType>('text')
const selectedCategoryId = ref<string>('none')
const accessMode = ref<ChannelAccessMode>('open')
const isLoading = ref(false)

const isOpen = computed({
  get: () => uiStore.activeModal === 'createChannel',
  set: (v) => { if (!v) uiStore.closeModal() },
})

// Pre-select category when opened from a category context menu
watch(isOpen, (open) => {
  if (open) {
    const data = uiStore.modalData as { categoryId?: string } | null
    selectedCategoryId.value = data?.categoryId ?? 'none'
  } else {
    channelName.value = ''
    channelType.value = 'text'
    selectedCategoryId.value = 'none'
    accessMode.value = 'open'
  }
})

async function handleCreate() {
  if (!channelName.value.trim()) return
  isLoading.value = true
  try {
    await channelsStore.createChannel(route.params.serverId as string, {
      name: channelName.value.trim().toLowerCase().replace(/\s+/g, '-'),
      type: channelType.value,
      categoryId: selectedCategoryId.value !== 'none' ? selectedCategoryId.value : undefined,
      accessMode: accessMode.value !== 'open' ? accessMode.value : undefined,
    })
    toast.success(t('channel.channelCreated'))
    uiStore.closeModal()
    channelName.value = ''
  } catch {
    toast.error(t('channel.failedCreateChannel'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ $t('channel.createChannel') }}</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <div class="space-y-2">
          <Label>{{ $t('channel.channelType') }}</Label>
          <RadioGroup v-model="channelType" class="grid grid-cols-2 gap-2">
            <Label
              for="type-text"
              :class="[
                'flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors',
                channelType === 'text'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-accent/50',
              ]"
            >
              <RadioGroupItem id="type-text" value="text" class="sr-only" />
              <Hash class="h-5 w-5 text-muted-foreground" />
              <div>
                <div class="text-sm font-medium text-foreground">{{ $t('channel.text') }}</div>
                <div class="text-xs text-muted-foreground">{{ $t('channel.textDesc') }}</div>
              </div>
            </Label>

            <Label
              for="type-voice"
              :class="[
                'flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors',
                channelType === 'voice'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-accent/50',
              ]"
            >
              <RadioGroupItem id="type-voice" value="voice" class="sr-only" />
              <Headphones class="h-5 w-5 text-muted-foreground" />
              <div>
                <div class="text-sm font-medium text-foreground">{{ $t('channel.voice') }}</div>
                <div class="text-xs text-muted-foreground">{{ $t('channel.voiceDesc') }}</div>
              </div>
            </Label>
          </RadioGroup>
        </div>

        <div class="space-y-2">
          <Label for="channel-name">{{ $t('channel.channelName') }}</Label>
          <Input
            id="channel-name"
            v-model="channelName"
            :placeholder="$t('channel.channelNamePlaceholder')"
            required
          />
        </div>

        <div v-if="channelsStore.categories.length > 0" class="space-y-2">
          <Label>{{ $t('channel.createCategory') }}</Label>
          <Select v-model="selectedCategoryId">
            <SelectTrigger>
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              <SelectItem
                v-for="cat in channelsStore.categories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="create-access-mode">{{ $t('channel.accessMode') }}</Label>
          <select
            id="create-access-mode"
            v-model="accessMode"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          >
            <option
              v-for="(label, mode) in AccessModeLabels"
              :key="mode"
              :value="mode"
            >
              {{ label }}
            </option>
          </select>
          <p class="text-xs text-muted-foreground">
            {{ AccessModeDescriptions[accessMode] }}
          </p>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">{{ $t('common.cancel') }}</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            {{ $t('channel.createChannel') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
