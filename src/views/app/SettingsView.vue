<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import { useResponsive } from '@/composables/useResponsive'
import { useTheme, themeLabels, themeNames, type ThemeName } from '@/composables/useTheme'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { useNotificationSettings } from '@/composables/useNotifications'
import { X, LogOut, User, Volume2, Palette, Bell } from 'lucide-vue-next'

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
  desktopPermission,
} = useNotificationSettings()

const activeTab = ref('account')

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
              <Card>
                <CardContent class="p-6">
                  <div class="flex items-center gap-4">
                    <UserAvatar
                      :src="authStore.user?.avatar ?? null"
                      :alt="authStore.user?.displayName ?? ''"
                      size="lg"
                    />
                    <div>
                      <h3 class="text-xl font-semibold text-foreground">
                        {{ authStore.user?.displayName }}
                      </h3>
                      <Separator class="my-2" />
                      <p class="text-sm text-muted-foreground">
                        {{ authStore.user?.username }}
                      </p>
                      <p class="text-sm text-muted-foreground">
                        {{ authStore.user?.email }}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </template>

            <!-- Voice & Audio -->
            <template v-if="activeTab === 'voice'">
              <h2 class="mb-6 text-xl font-bold text-foreground">Voice & Audio</h2>
              <Card>
                <CardContent class="p-6">
                  <p class="text-sm text-muted-foreground">Voice and audio settings will be available here.</p>
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
                  <Switch :checked="soundEnabled" @update:checked="setSoundEnabled" />
                </CardContent>
              </Card>

              <Card>
                <CardContent class="flex items-center justify-between p-6">
                  <div>
                    <h3 class="text-sm font-medium text-foreground">Desktop Notifications</h3>
                    <p class="text-sm text-muted-foreground">Show native desktop notifications for new messages</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <Button
                      v-if="desktopPermission !== 'granted' && desktopEnabled"
                      size="sm"
                      variant="outline"
                      @click="requestDesktopPermission"
                    >
                      Allow
                    </Button>
                    <Switch :checked="desktopEnabled" @update:checked="setDesktopEnabled" />
                  </div>
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
                      @click="uiStore.setTheme(name)"
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
