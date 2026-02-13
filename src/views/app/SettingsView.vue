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
import { useNotificationSettings } from '@/composables/useNotifications'
import { X, LogOut, User, Volume2, Palette, Bell, Camera, Loader2, Mic } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useVoiceStore } from '@/stores/voice'
import { webrtcService } from '@/services/webrtc'
import type { MediaDeviceOption } from '@/types'

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

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

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

      <ScrollArea class="flex-1">
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
