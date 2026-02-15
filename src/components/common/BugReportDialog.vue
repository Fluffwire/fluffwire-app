<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { reportBug } from '@/services/bugApi'
import { getSystemInfo, type SystemInfo } from '@/utils/systemInfo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Bug, ExternalLink } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const title = ref('')
const description = ref('')
const systemInfo = ref<SystemInfo | null>(null)
const isSubmitting = ref(false)
const createdIssueUrl = ref<string | null>(null)

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const canSubmit = computed(() => {
  return title.value.trim().length > 0 && description.value.trim().length > 10
})

onMounted(async () => {
  systemInfo.value = await getSystemInfo()
})

async function handleSubmit() {
  if (!canSubmit.value || !systemInfo.value) return

  isSubmitting.value = true
  try {
    const result = await reportBug(title.value.trim(), description.value.trim(), systemInfo.value)
    createdIssueUrl.value = result.issueUrl
    toast.success(t('bugs.reportSuccess'), {
      description: t('bugs.reportSuccessDesc', { number: result.issueNumber }),
    })

    // Reset form
    title.value = ''
    description.value = ''
  } catch (error: any) {
    console.error('Failed to report bug:', error)
    toast.error(t('bugs.reportFailed'), {
      description: error.response?.data?.message || t('bugs.reportFailedDesc'),
    })
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  if (!isSubmitting.value) {
    isOpen.value = false
    // Reset form after closing
    setTimeout(() => {
      title.value = ''
      description.value = ''
      createdIssueUrl.value = null
    }, 300)
  }
}

function openIssue() {
  if (createdIssueUrl.value) {
    window.open(createdIssueUrl.value, '_blank')
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Bug class="h-5 w-5" />
          {{ t('bugs.reportBug') }}
        </DialogTitle>
        <DialogDescription>
          {{ t('bugs.reportBugDesc') }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="!createdIssueUrl" class="space-y-4">
        <div class="space-y-2">
          <Label for="bug-title">{{ t('bugs.title') }}</Label>
          <Input
            id="bug-title"
            v-model="title"
            :placeholder="t('bugs.titlePlaceholder')"
            :disabled="isSubmitting"
            maxlength="100"
          />
        </div>

        <div class="space-y-2">
          <Label for="bug-description">{{ t('bugs.description') }}</Label>
          <Textarea
            id="bug-description"
            v-model="description"
            :placeholder="t('bugs.descriptionPlaceholder')"
            :disabled="isSubmitting"
            rows="8"
            class="resize-none"
          />
          <p class="text-xs text-muted-foreground">
            {{ t('bugs.descriptionHint') }}
          </p>
        </div>

        <div class="space-y-2">
          <Label>{{ t('bugs.systemInfo') }}</Label>
          <div class="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono">
            <div v-if="systemInfo">
              <div><strong>{{ t('bugs.platform') }}:</strong> {{ systemInfo.platform }}</div>
              <div><strong>{{ t('bugs.os') }}:</strong> {{ systemInfo.os }}</div>
              <div><strong>{{ t('bugs.version') }}:</strong> {{ systemInfo.appVersion }}</div>
              <div v-if="systemInfo.tauriVersion">
                <strong>Tauri:</strong> {{ systemInfo.tauriVersion }}
              </div>
              <div><strong>{{ t('bugs.locale') }}:</strong> {{ systemInfo.locale }}</div>
            </div>
            <div v-else class="text-muted-foreground">
              {{ t('bugs.loadingSystemInfo') }}
            </div>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ t('bugs.systemInfoHint') }}
          </p>
        </div>
      </div>

      <div v-else class="space-y-4 py-4">
        <div class="flex items-center justify-center">
          <div class="rounded-full bg-emerald-500/10 p-3">
            <Bug class="h-8 w-8 text-emerald-500" />
          </div>
        </div>
        <div class="space-y-2 text-center">
          <h3 class="font-semibold">{{ t('bugs.issueCreated') }}</h3>
          <p class="text-sm text-muted-foreground">
            {{ t('bugs.issueCreatedDesc') }}
          </p>
        </div>
        <Button @click="openIssue" class="w-full" variant="outline">
          <ExternalLink class="mr-2 h-4 w-4" />
          {{ t('bugs.viewIssue') }}
        </Button>
      </div>

      <DialogFooter v-if="!createdIssueUrl">
        <Button @click="handleClose" variant="ghost" :disabled="isSubmitting">
          {{ t('common.cancel') }}
        </Button>
        <Button @click="handleSubmit" :disabled="!canSubmit || isSubmitting" :loading="isSubmitting">
          <Bug class="mr-2 h-4 w-4" />
          {{ t('bugs.submit') }}
        </Button>
      </DialogFooter>

      <DialogFooter v-else>
        <Button @click="handleClose" class="w-full">
          {{ t('common.close') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
