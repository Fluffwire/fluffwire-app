<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import { useResponsive } from '@/composables/useResponsive'
import { useTheme, themeLabels, themeNames, type ThemeName } from '@/composables/useTheme'
import { uploadFile } from '@/services/api'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useNotificationSettings } from '@/composables/useNotifications'
import { X, LogOut, User, Volume2, Palette, Bell, Camera, Loader2, Mic, AlertTriangle, Shield, Copy, Eye, EyeOff, Monitor, Smartphone } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useVoiceStore } from '@/stores/voice'
import { webrtcService } from '@/services/webrtc'
import type { MediaDeviceOption, TotpSetup, SessionInfo } from '@/types'
import api from '@/services/api'
import { API } from '@/constants/endpoints'

const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()
const { isMobile } = useResponsive()
const { theme, setTheme } = useTheme()
const {
  soundEnabled,
  desktopEnabled,
  setSoundEnabled,
  setDesktopEnabled,
  requestDesktopPermission,
  playTestSound,
  desktopPermission,
} = useNotificationSettings()

const desktopPermissionDenied = ref(false)

function handleSoundToggle(value: boolean) {
  setSoundEnabled(value)
  toast.success(value ? 'Sound enabled' : 'Sound disabled')
}

async function handleDesktopToggle(value: boolean) {
  const result = await setDesktopEnabled(value)
  if (value && result === false) {
    desktopPermissionDenied.value = true
  } else {
    desktopPermissionDenied.value = false
  }
}

const activeTab = ref('account')

// Profile editing
const profileDisplayName = ref('')
const profileBio = ref('')
const profileAvatarFile = ref<File | null>(null)
const profileAvatarPreview = ref<string | null>(null)
const profileSaving = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

watch(() => authStore.user, (u) => {
  if (u) {
    profileDisplayName.value = u.displayName
    profileBio.value = (u as { bio?: string }).bio ?? ''
  }
}, { immediate: true })

function handleAvatarSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return
  profileAvatarFile.value = file
  profileAvatarPreview.value = URL.createObjectURL(file)
}

async function saveProfile() {
  profileSaving.value = true
  try {
    const updates: { displayName?: string; avatar?: string; bio?: string } = {}
    const name = profileDisplayName.value.trim()
    if (name && name !== authStore.user?.displayName) {
      updates.displayName = name
    }
    const bio = profileBio.value.trim()
    if (bio !== ((authStore.user as { bio?: string })?.bio ?? '')) {
      updates.bio = bio
    }
    if (profileAvatarFile.value) {
      const { url } = await uploadFile(profileAvatarFile.value)
      updates.avatar = url
    }
    if (Object.keys(updates).length > 0) {
      await authStore.updateProfile(updates)
      toast.success('Profile updated')
    }
    profileAvatarFile.value = null
    profileAvatarPreview.value = null
  } catch {
    toast.error('Failed to update profile')
  } finally {
    profileSaving.value = false
  }
}

const voiceStore = useVoiceStore()
const audioDevices = ref<MediaDeviceOption[]>([])
const capturingPttKey = ref(false)

// Mic test state
const micTestActive = ref(false)
const micTestLevel = ref(0)
let micTestStream: MediaStream | null = null
let micTestAnimFrame = 0

async function startMicTest() {
  try {
    micTestStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    micTestActive.value = true
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(micTestStream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      micTestLevel.value = Math.min(100, Math.round((avg / 128) * 100))
      micTestAnimFrame = requestAnimationFrame(tick)
    }
    tick()
  } catch {
    toast.error('Could not access microphone')
  }
}

function stopMicTest() {
  cancelAnimationFrame(micTestAnimFrame)
  micTestStream?.getTracks().forEach((t) => t.stop())
  micTestStream = null
  micTestActive.value = false
  micTestLevel.value = 0
}

async function loadAudioDevices() {
  audioDevices.value = await webrtcService.getAudioDevices()
}

function startPttCapture() {
  capturingPttKey.value = true
  function onKey(e: KeyboardEvent) {
    e.preventDefault()
    voiceStore.setPttKey(e.code)
    capturingPttKey.value = false
    window.removeEventListener('keydown', onKey)
  }
  window.addEventListener('keydown', onKey)
}

function formatKeyCode(code: string): string {
  return code.replace('Key', '').replace('Digit', '').replace('Left', 'L-').replace('Right', 'R-')
}

const hasProfileChanges = ref(false)
watch([profileDisplayName, profileBio, profileAvatarFile], () => {
  const nameChanged = profileDisplayName.value.trim() !== (authStore.user?.displayName ?? '')
  const bioChanged = profileBio.value.trim() !== ((authStore.user as { bio?: string })?.bio ?? '')
  hasProfileChanges.value = nameChanged || bioChanged || !!profileAvatarFile.value
})

// Account deletion
const showDeleteDialog = ref(false)
const deletePassword = ref('')
const deleteConfirmText = ref('')
const deleteLoading = ref(false)
const deleteError = ref('')
const cancellingDeletion = ref(false)

async function handleDeleteAccount() {
  if (deleteConfirmText.value !== 'DELETE') return
  if (!deletePassword.value) {
    deleteError.value = 'Password is required'
    return
  }
  deleteLoading.value = true
  deleteError.value = ''
  try {
    await authStore.deleteAccount(deletePassword.value)
    showDeleteDialog.value = false
    authStore.logout()
    router.push('/login')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    deleteError.value = err.response?.data?.message || 'Failed to delete account'
  } finally {
    deleteLoading.value = false
  }
}

async function handleCancelDeletion() {
  cancellingDeletion.value = true
  try {
    await authStore.cancelDeletion()
    toast.success('Account deletion cancelled')
  } catch {
    toast.error('Failed to cancel deletion')
  } finally {
    cancellingDeletion.value = false
  }
}

function openDeleteDialog() {
  deletePassword.value = ''
  deleteConfirmText.value = ''
  deleteError.value = ''
  showDeleteDialog.value = true
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// --- Security tab state ---
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)

async function handleChangePassword() {
  if (!currentPassword.value || !newPassword.value) return
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Passwords do not match')
    return
  }
  if (newPassword.value.length < 8) {
    toast.error('Password must be at least 8 characters')
    return
  }
  passwordSaving.value = true
  try {
    await authStore.changePassword(currentPassword.value, newPassword.value)
    toast.success('Password changed successfully')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Failed to change password')
  } finally {
    passwordSaving.value = false
  }
}

// 2FA state
const totpSetup = ref<TotpSetup | null>(null)
const totpEnableCode = ref('')
const totpEnabling = ref(false)
const totpDisableCode = ref('')
const totpDisablePassword = ref('')
const totpDisabling = ref(false)
const showBackupCodes = ref(false)
const backupCodes = ref<string[]>([])

async function handleSetupTotp() {
  try {
    const { data } = await api.post<TotpSetup>(API.USERS.TOTP_SETUP)
    totpSetup.value = data
    totpEnableCode.value = ''
  } catch {
    toast.error('Failed to generate 2FA setup')
  }
}

async function handleEnableTotp() {
  if (!totpSetup.value || !totpEnableCode.value.trim()) return
  totpEnabling.value = true
  try {
    const { data } = await api.post<{ backupCodes: string[] }>(API.USERS.TOTP_ENABLE, {
      secret: totpSetup.value.secret,
      code: totpEnableCode.value.trim(),
    })
    if (authStore.user) authStore.user.totpEnabled = true
    backupCodes.value = data.backupCodes
    showBackupCodes.value = true
    totpSetup.value = null
    totpEnableCode.value = ''
    toast.success('Two-factor authentication enabled')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Invalid code')
  } finally {
    totpEnabling.value = false
  }
}

async function handleDisableTotp() {
  if (!totpDisablePassword.value || !totpDisableCode.value.trim()) return
  totpDisabling.value = true
  try {
    await api.post(API.USERS.TOTP_DISABLE, {
      password: totpDisablePassword.value,
      code: totpDisableCode.value.trim(),
    })
    if (authStore.user) authStore.user.totpEnabled = false
    totpDisableCode.value = ''
    totpDisablePassword.value = ''
    toast.success('Two-factor authentication disabled')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Failed to disable 2FA')
  } finally {
    totpDisabling.value = false
  }
}

function copyBackupCodes() {
  navigator.clipboard.writeText(backupCodes.value.join('\n'))
  toast.success('Backup codes copied to clipboard')
}

// Sessions state
const sessions = ref<SessionInfo[]>([])
const sessionsLoading = ref(false)
const revokingSession = ref<string | null>(null)
const revokingAll = ref(false)

async function loadSessions() {
  sessionsLoading.value = true
  try {
    sessions.value = await authStore.fetchSessions()
  } catch {
    toast.error('Failed to load sessions')
  } finally {
    sessionsLoading.value = false
  }
}

async function handleRevokeSession(sessionId: string) {
  revokingSession.value = sessionId
  try {
    await authStore.revokeSession(sessionId)
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    toast.success('Session revoked')
  } catch {
    toast.error('Failed to revoke session')
  } finally {
    revokingSession.value = null
  }
}

async function handleRevokeAllSessions() {
  revokingAll.value = true
  try {
    await authStore.revokeAllSessions()
    sessions.value = sessions.value.filter(s => s.isCurrent)
    toast.success('All other sessions revoked')
  } catch {
    toast.error('Failed to revoke sessions')
  } finally {
    revokingAll.value = false
  }
}

function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return Smartphone
  return Monitor
}

function formatSessionDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Load sessions when security tab is opened
watch(activeTab, (tab) => {
  if (tab === 'security') loadSessions()
})

function close() {
  router.back()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const tabs = [
  { key: 'account', label: 'My Account', icon: User },
  { key: 'voice', label: 'Voice & Audio', icon: Volume2 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'appearance', label: 'Appearance', icon: Palette },
]

const themePreviewColors: Record<ThemeName, string> = {
  green: 'oklch(0.696 0.178 149.58)',
  blue: 'oklch(0.637 0.196 259)',
  purple: 'oklch(0.627 0.222 292)',
  rose: 'oklch(0.681 0.2 14)',
  orange: 'oklch(0.74 0.18 62)',
  cyan: 'oklch(0.715 0.143 200)',
}
</script>

<template>
  <div class="flex h-full">
    <!-- Settings nav sidebar — on mobile: horizontal scroll at top -->
    <template v-if="!isMobile">
      <aside class="flex h-full w-60 shrink-0 flex-col bg-card border-r border-border/50">
        <div class="flex h-12 items-center border-b border-border/50 px-4">
          <h2 class="font-semibold text-foreground">Settings</h2>
        </div>
        <ScrollArea class="flex-1">
          <nav class="space-y-0.5 px-2 py-2">
            <h3 class="mb-1 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              User Settings
            </h3>
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                activeTab === tab.key
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              ]"
            >
              <component :is="tab.icon" class="h-4 w-4" />
              {{ tab.label }}
            </button>

            <Separator class="my-2" />

            <button
              @click="handleLogout"
              class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut class="h-4 w-4" />
              Log Out
            </button>
          </nav>
        </ScrollArea>
      </aside>
    </template>

    <!-- Settings content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Mobile: horizontal tabs -->
      <div v-if="isMobile" class="flex items-center gap-2 overflow-x-auto border-b border-border/50 px-4 py-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
            activeTab === tab.key
              ? 'bg-accent font-medium text-foreground'
              : 'text-muted-foreground',
          ]"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>

        <Separator orientation="vertical" class="h-6" />

        <button
          @click="handleLogout"
          class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-destructive"
        >
          <LogOut class="h-4 w-4" />
          Log Out
        </button>
      </div>

      <ScrollArea class="flex-1 min-h-0">
        <div class="flex p-4 sm:p-8">
          <div class="w-full max-w-2xl">
            <!-- My Account -->
            <template v-if="activeTab === 'account'">
              <h2 class="mb-6 text-xl font-bold text-foreground">My Account</h2>
              <Card class="mb-4">
                <CardContent class="p-6">
                  <div class="flex items-start gap-4">
                    <!-- Avatar with upload -->
                    <div class="relative shrink-0">
                      <button @click="avatarInput?.click()" class="group relative">
                        <UserAvatar
                          :src="profileAvatarPreview ?? authStore.user?.avatar ?? null"
                          :alt="authStore.user?.displayName ?? ''"
                          size="lg"
                        />
                        <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera class="h-5 w-5 text-white" />
                        </div>
                      </button>
                      <input
                        ref="avatarInput"
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleAvatarSelect"
                      />
                    </div>
                    <div class="min-w-0 flex-1 space-y-4">
                      <div>
                        <p class="text-xs text-muted-foreground">{{ authStore.user?.username }}</p>
                        <p class="text-xs text-muted-foreground">{{ authStore.user?.email }}</p>
                      </div>

                      <div class="space-y-2">
                        <Label for="profile-display-name">Display Name</Label>
                        <Input
                          id="profile-display-name"
                          v-model="profileDisplayName"
                          placeholder="Display name"
                          maxlength="32"
                        />
                      </div>

                      <div class="space-y-2">
                        <Label for="profile-bio">About Me</Label>
                        <textarea
                          id="profile-bio"
                          v-model="profileBio"
                          maxlength="500"
                          rows="3"
                          placeholder="Tell us about yourself"
                          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                        <p class="text-xs text-muted-foreground">{{ profileBio.length }}/500</p>
                      </div>

                      <Button
                        @click="saveProfile"
                        :disabled="!hasProfileChanges || profileSaving"
                        size="sm"
                      >
                        <Loader2 v-if="profileSaving" class="mr-2 h-4 w-4 animate-spin" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <!-- Pending deletion warning -->
              <Card v-if="authStore.user?.deleteScheduledAt" class="mb-4 border-amber-500/50">
                <CardContent class="p-6">
                  <div class="flex items-start gap-3">
                    <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div class="flex-1 space-y-2">
                      <h3 class="text-sm font-semibold text-amber-500">Account Scheduled for Deletion</h3>
                      <p class="text-sm text-muted-foreground">
                        Your account is scheduled to be permanently deleted on
                        <span class="font-medium text-foreground">
                          {{ new Date(authStore.user.deleteScheduledAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) }}
                        </span>.
                        You can cancel this at any time before that date.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        :disabled="cancellingDeletion"
                        @click="handleCancelDeletion"
                      >
                        <Loader2 v-if="cancellingDeletion" class="mr-2 h-4 w-4 animate-spin" />
                        Cancel Deletion
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <!-- Delete account -->
              <Card v-if="!authStore.user?.deleteScheduledAt" class="border-destructive/30">
                <CardContent class="p-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-sm font-medium text-destructive">Delete Account</h3>
                      <p class="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="destructive" size="sm" @click="openDeleteDialog">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <!-- Delete confirmation dialog -->
              <AlertDialog v-model:open="showDeleteDialog">
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2 text-destructive">
                      <AlertTriangle class="h-5 w-5" />
                      Delete Account
                    </AlertDialogTitle>
                    <AlertDialogDescription class="space-y-3">
                      <p>
                        This will schedule your account for permanent deletion. You will have
                        <span class="font-semibold text-foreground">30 days</span> to cancel before
                        your account and all associated data are permanently removed.
                      </p>
                      <p>This includes your messages, servers you own, and all other data.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div class="space-y-3 py-2">
                    <div v-if="deleteError" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {{ deleteError }}
                    </div>

                    <div class="space-y-2">
                      <Label for="delete-password">Confirm your password</Label>
                      <Input
                        id="delete-password"
                        v-model="deletePassword"
                        type="password"
                        placeholder="Enter your password"
                        autocomplete="current-password"
                      />
                    </div>

                    <div class="space-y-2">
                      <Label for="delete-confirm">
                        Type <span class="font-mono font-bold text-destructive">DELETE</span> to confirm
                      </Label>
                      <Input
                        id="delete-confirm"
                        v-model="deleteConfirmText"
                        placeholder="Type DELETE"
                      />
                    </div>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      :disabled="deleteConfirmText !== 'DELETE' || !deletePassword || deleteLoading"
                      @click="handleDeleteAccount"
                    >
                      <Loader2 v-if="deleteLoading" class="mr-2 h-4 w-4 animate-spin" />
                      Delete Account
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </template>

            <!-- Voice & Audio -->
            <template v-if="activeTab === 'voice'">
              <h2 class="mb-6 text-xl font-bold text-foreground">Voice & Audio</h2>

              <!-- Input Mode -->
              <Card class="mb-4">
                <CardHeader>
                  <CardTitle class="text-base">Input Mode</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="flex gap-3">
                    <button
                      @click="voiceStore.setVoiceMode('voice-activity')"
                      :class="[
                        'flex-1 rounded-lg border-2 p-4 text-left transition-all',
                        voiceStore.voiceMode === 'voice-activity'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      ]"
                    >
                      <div class="text-sm font-medium text-foreground">Voice Activity</div>
                      <div class="mt-1 text-xs text-muted-foreground">Automatically transmit when you speak</div>
                    </button>
                    <button
                      @click="voiceStore.setVoiceMode('push-to-talk')"
                      :class="[
                        'flex-1 rounded-lg border-2 p-4 text-left transition-all',
                        voiceStore.voiceMode === 'push-to-talk'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      ]"
                    >
                      <div class="text-sm font-medium text-foreground">Push to Talk</div>
                      <div class="mt-1 text-xs text-muted-foreground">Hold a key to transmit</div>
                    </button>
                  </div>

                  <!-- VAD Sensitivity -->
                  <div v-if="voiceStore.voiceMode === 'voice-activity'" class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium text-foreground">Sensitivity</label>
                      <span class="text-xs text-muted-foreground">{{ voiceStore.vadThreshold }}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      :value="voiceStore.vadThreshold"
                      @input="voiceStore.setVadThreshold(Number(($event.target as HTMLInputElement).value))"
                      class="w-full accent-primary"
                    />
                    <div class="flex justify-between text-[10px] text-muted-foreground">
                      <span>Sensitive</span>
                      <span>Less sensitive</span>
                    </div>
                  </div>

                  <!-- PTT Key -->
                  <div v-if="voiceStore.voiceMode === 'push-to-talk'" class="space-y-2">
                    <label class="text-sm font-medium text-foreground">Shortcut</label>
                    <Button
                      variant="outline"
                      @click="startPttCapture"
                      class="w-full justify-start gap-2"
                    >
                      <Mic class="h-4 w-4" />
                      <template v-if="capturingPttKey">
                        <span class="animate-pulse text-primary">Press a key...</span>
                      </template>
                      <template v-else>
                        {{ formatKeyCode(voiceStore.pttKey) }}
                      </template>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <!-- Mic Test -->
              <Card class="mb-4">
                <CardHeader>
                  <CardTitle class="text-base">Mic Test</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <Button
                    v-if="!micTestActive"
                    variant="outline"
                    class="gap-2"
                    @click="startMicTest"
                  >
                    <Mic class="h-4 w-4" />
                    Start Mic Test
                  </Button>
                  <Button
                    v-else
                    variant="destructive"
                    class="gap-2"
                    @click="stopMicTest"
                  >
                    <Mic class="h-4 w-4" />
                    Stop Test
                  </Button>
                  <div v-if="micTestActive" class="space-y-1">
                    <div class="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        class="h-full rounded-full bg-primary transition-all duration-75"
                        :style="{ width: micTestLevel + '%' }"
                      />
                    </div>
                    <p class="text-xs text-muted-foreground">Speak into your microphone to test</p>
                  </div>
                </CardContent>
              </Card>

              <!-- Audio Devices -->
              <Card>
                <CardHeader>
                  <CardTitle class="text-base">Audio Devices</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-foreground">Input Device</label>
                    <select
                      @focus="loadAudioDevices"
                      @change="webrtcService.setInputDevice(($event.target as HTMLSelectElement).value)"
                      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Default</option>
                      <option
                        v-for="d in audioDevices.filter(d => d.kind === 'audioinput')"
                        :key="d.deviceId"
                        :value="d.deviceId"
                      >
                        {{ d.label }}
                      </option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-foreground">Output Device</label>
                    <select
                      @focus="loadAudioDevices"
                      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Default</option>
                      <option
                        v-for="d in audioDevices.filter(d => d.kind === 'audiooutput')"
                        :key="d.deviceId"
                        :value="d.deviceId"
                      >
                        {{ d.label }}
                      </option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </template>

            <!-- Notifications -->
            <template v-if="activeTab === 'notifications'">
              <h2 class="mb-6 text-xl font-bold text-foreground">Notifications</h2>

              <Card class="mb-4">
                <CardContent class="flex items-center justify-between p-6">
                  <div>
                    <h3 class="text-sm font-medium text-foreground">Notification Sound</h3>
                    <p class="text-sm text-muted-foreground">Play a sound when a new message arrives</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <Button size="sm" variant="outline" @click="playTestSound">
                      Test Sound
                    </Button>
                    <Switch :model-value="soundEnabled" @update:model-value="handleSoundToggle" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent class="p-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-sm font-medium text-foreground">Desktop Notifications</h3>
                      <p class="text-sm text-muted-foreground">Show native desktop notifications for new messages</p>
                    </div>
                    <Switch :model-value="desktopEnabled" @update:model-value="handleDesktopToggle" />
                  </div>
                  <p v-if="desktopPermissionDenied" class="mt-2 text-sm text-destructive">
                    Notification permission was denied by the browser. Please allow notifications in your browser settings.
                  </p>
                </CardContent>
              </Card>
            </template>

            <!-- Security -->
            <template v-if="activeTab === 'security'">
              <h2 class="mb-6 text-xl font-bold text-foreground">Security</h2>

              <!-- Change Password -->
              <Card class="mb-4">
                <CardHeader>
                  <CardTitle class="text-base">Change Password</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="space-y-2">
                    <Label for="current-password">Current Password</Label>
                    <div class="relative">
                      <Input
                        id="current-password"
                        v-model="currentPassword"
                        :type="showCurrentPassword ? 'text' : 'password'"
                        placeholder="Enter current password"
                        autocomplete="current-password"
                      />
                      <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        @click="showCurrentPassword = !showCurrentPassword"
                      >
                        <component :is="showCurrentPassword ? EyeOff : Eye" class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label for="new-password">New Password</Label>
                    <div class="relative">
                      <Input
                        id="new-password"
                        v-model="newPassword"
                        :type="showNewPassword ? 'text' : 'password'"
                        placeholder="Enter new password"
                        autocomplete="new-password"
                      />
                      <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        @click="showNewPassword = !showNewPassword"
                      >
                        <component :is="showNewPassword ? EyeOff : Eye" class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <Label for="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      v-model="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      autocomplete="new-password"
                    />
                    <p v-if="confirmPassword && newPassword !== confirmPassword" class="text-xs text-destructive">
                      Passwords do not match
                    </p>
                  </div>
                  <Button
                    :disabled="!currentPassword || !newPassword || newPassword !== confirmPassword || passwordSaving"
                    @click="handleChangePassword"
                    size="sm"
                  >
                    <Loader2 v-if="passwordSaving" class="mr-2 h-4 w-4 animate-spin" />
                    Change Password
                  </Button>
                </CardContent>
              </Card>

              <!-- Two-Factor Authentication -->
              <Card class="mb-4">
                <CardHeader>
                  <CardTitle class="text-base">Two-Factor Authentication</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <template v-if="!authStore.user?.totpEnabled">
                    <p class="text-sm text-muted-foreground">
                      Add an extra layer of security to your account by requiring a verification code from your authenticator app.
                    </p>

                    <!-- Setup flow -->
                    <template v-if="!totpSetup">
                      <Button @click="handleSetupTotp" size="sm">
                        <Shield class="mr-2 h-4 w-4" />
                        Enable Two-Factor Auth
                      </Button>
                    </template>

                    <template v-else>
                      <div class="space-y-4">
                        <p class="text-sm text-foreground">Scan this QR code with your authenticator app:</p>
                        <div class="flex justify-center rounded-lg bg-white p-4">
                          <img :src="totpSetup.qrUri" alt="QR Code" class="h-48 w-48" />
                        </div>
                        <div class="space-y-1">
                          <p class="text-xs text-muted-foreground">Or enter this secret manually:</p>
                          <code class="block break-all rounded bg-muted px-3 py-2 text-sm">{{ totpSetup.secret }}</code>
                        </div>
                        <div class="space-y-2">
                          <Label for="totp-verify-code">Enter verification code</Label>
                          <Input
                            id="totp-verify-code"
                            v-model="totpEnableCode"
                            placeholder="6-digit code"
                            maxlength="6"
                            class="text-center text-lg tracking-widest"
                          />
                        </div>
                        <div class="flex gap-2">
                          <Button
                            :disabled="!totpEnableCode.trim() || totpEnabling"
                            @click="handleEnableTotp"
                            size="sm"
                          >
                            <Loader2 v-if="totpEnabling" class="mr-2 h-4 w-4 animate-spin" />
                            Verify & Enable
                          </Button>
                          <Button variant="ghost" size="sm" @click="totpSetup = null">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </template>
                  </template>

                  <template v-else>
                    <div class="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                      <Shield class="h-5 w-5 text-primary" />
                      <span class="text-sm font-medium text-primary">Two-factor authentication is enabled</span>
                    </div>

                    <div class="space-y-3 border-t border-border pt-4">
                      <p class="text-sm text-muted-foreground">To disable 2FA, enter your password and a verification code.</p>
                      <div class="space-y-2">
                        <Label for="totp-disable-password">Password</Label>
                        <Input
                          id="totp-disable-password"
                          v-model="totpDisablePassword"
                          type="password"
                          placeholder="Enter your password"
                        />
                      </div>
                      <div class="space-y-2">
                        <Label for="totp-disable-code">Verification Code</Label>
                        <Input
                          id="totp-disable-code"
                          v-model="totpDisableCode"
                          placeholder="6-digit code"
                          maxlength="8"
                          class="text-center text-lg tracking-widest"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        :disabled="!totpDisablePassword || !totpDisableCode.trim() || totpDisabling"
                        @click="handleDisableTotp"
                      >
                        <Loader2 v-if="totpDisabling" class="mr-2 h-4 w-4 animate-spin" />
                        Disable Two-Factor Auth
                      </Button>
                    </div>
                  </template>

                  <!-- Backup codes modal -->
                  <template v-if="showBackupCodes">
                    <div class="space-y-3 border-t border-border pt-4">
                      <div class="flex items-start gap-2">
                        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div>
                          <h4 class="text-sm font-semibold text-foreground">Save Your Backup Codes</h4>
                          <p class="text-sm text-muted-foreground">
                            Store these codes in a safe place. Each code can only be used once to sign in if you lose access to your authenticator app.
                          </p>
                        </div>
                      </div>
                      <div class="rounded-lg bg-muted p-4 font-mono text-sm">
                        <div class="grid grid-cols-2 gap-2">
                          <span v-for="code in backupCodes" :key="code">{{ code }}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" class="gap-2" @click="copyBackupCodes">
                        <Copy class="h-4 w-4" />
                        Copy Codes
                      </Button>
                    </div>
                  </template>
                </CardContent>
              </Card>

              <!-- Active Sessions -->
              <Card>
                <CardHeader class="flex-row items-center justify-between space-y-0">
                  <CardTitle class="text-base">Active Sessions</CardTitle>
                  <Button
                    v-if="sessions.length > 1"
                    variant="outline"
                    size="sm"
                    :disabled="revokingAll"
                    @click="handleRevokeAllSessions"
                  >
                    <Loader2 v-if="revokingAll" class="mr-2 h-4 w-4 animate-spin" />
                    Log Out All Other Devices
                  </Button>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div v-if="sessionsLoading" class="flex items-center justify-center py-8">
                    <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                  <template v-else>
                    <div
                      v-for="session in sessions"
                      :key="session.id"
                      class="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <component :is="getDeviceIcon(session.userAgent)" class="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <p class="truncate text-sm font-medium text-foreground">{{ session.userAgent || 'Unknown device' }}</p>
                          <span
                            v-if="session.isCurrent"
                            class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            Current
                          </span>
                        </div>
                        <p class="text-xs text-muted-foreground">
                          {{ session.ipAddress }} &middot; Last active {{ formatSessionDate(session.lastUsedAt) }}
                        </p>
                      </div>
                      <Button
                        v-if="!session.isCurrent"
                        variant="ghost"
                        size="sm"
                        class="shrink-0 text-destructive hover:text-destructive"
                        :disabled="revokingSession === session.id"
                        @click="handleRevokeSession(session.id)"
                      >
                        <Loader2 v-if="revokingSession === session.id" class="mr-1 h-3 w-3 animate-spin" />
                        Revoke
                      </Button>
                    </div>
                    <p v-if="!sessions.length" class="py-4 text-center text-sm text-muted-foreground">
                      No active sessions found
                    </p>
                  </template>
                </CardContent>
              </Card>
            </template>

            <!-- Appearance / Theme Picker -->
            <template v-if="activeTab === 'appearance'">
              <h2 class="mb-6 text-xl font-bold text-foreground">Appearance</h2>
              <Card>
                <CardHeader>
                  <CardTitle class="text-base">Theme Color</CardTitle>
                </CardHeader>
                <CardContent>
                  <p class="mb-4 text-sm text-muted-foreground">
                    Choose your accent color. This changes the primary color throughout the interface.
                  </p>
                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <button
                      v-for="name in themeNames"
                      :key="name"
                      @click="uiStore.setTheme(name); toast.success('Theme updated')"
                      :class="[
                        'flex items-center gap-3 rounded-xl border-2 p-4 transition-all',
                        theme === name
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-border hover:border-primary/40',
                      ]"
                    >
                      <div
                        class="h-8 w-8 shrink-0 rounded-full shadow-inner"
                        :style="{ backgroundColor: themePreviewColors[name] }"
                      />
                      <div class="text-left">
                        <div class="text-sm font-medium text-foreground">{{ themeLabels[name] }}</div>
                        <div class="text-xs text-muted-foreground capitalize">{{ name }}</div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </template>
          </div>

          <!-- Close button (not on mobile) -->
          <div v-if="!isMobile" class="ml-4 shrink-0">
            <Button
              variant="outline"
              size="icon"
              class="rounded-full"
              @click="close"
            >
              <X class="h-4 w-4" />
            </Button>
            <p class="mt-1 text-center text-xs text-muted-foreground">ESC</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
