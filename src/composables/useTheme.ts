import { ref, readonly } from 'vue'

export type ThemeName = 'green' | 'blue' | 'purple' | 'rose' | 'orange' | 'cyan'

interface ThemeColors {
  '--primary': string
  '--primary-foreground': string
  '--ring': string
  '--sidebar-primary': string
  '--sidebar-ring': string
}

const themes: Record<ThemeName, ThemeColors> = {
  green: {
    '--primary': 'oklch(0.696 0.178 149.58)',
    '--primary-foreground': 'oklch(0.16 0.006 285)',
    '--ring': 'oklch(0.696 0.178 149.58)',
    '--sidebar-primary': 'oklch(0.696 0.178 149.58)',
    '--sidebar-ring': 'oklch(0.696 0.178 149.58)',
  },
  blue: {
    '--primary': 'oklch(0.637 0.196 259)',
    '--primary-foreground': 'oklch(0.985 0 0)',
    '--ring': 'oklch(0.637 0.196 259)',
    '--sidebar-primary': 'oklch(0.637 0.196 259)',
    '--sidebar-ring': 'oklch(0.637 0.196 259)',
  },
  purple: {
    '--primary': 'oklch(0.627 0.222 292)',
    '--primary-foreground': 'oklch(0.985 0 0)',
    '--ring': 'oklch(0.627 0.222 292)',
    '--sidebar-primary': 'oklch(0.627 0.222 292)',
    '--sidebar-ring': 'oklch(0.627 0.222 292)',
  },
  rose: {
    '--primary': 'oklch(0.681 0.2 14)',
    '--primary-foreground': 'oklch(0.985 0 0)',
    '--ring': 'oklch(0.681 0.2 14)',
    '--sidebar-primary': 'oklch(0.681 0.2 14)',
    '--sidebar-ring': 'oklch(0.681 0.2 14)',
  },
  orange: {
    '--primary': 'oklch(0.74 0.18 62)',
    '--primary-foreground': 'oklch(0.16 0.006 285)',
    '--ring': 'oklch(0.74 0.18 62)',
    '--sidebar-primary': 'oklch(0.74 0.18 62)',
    '--sidebar-ring': 'oklch(0.74 0.18 62)',
  },
  cyan: {
    '--primary': 'oklch(0.715 0.143 200)',
    '--primary-foreground': 'oklch(0.16 0.006 285)',
    '--ring': 'oklch(0.715 0.143 200)',
    '--sidebar-primary': 'oklch(0.715 0.143 200)',
    '--sidebar-ring': 'oklch(0.715 0.143 200)',
  },
}

export const themeLabels: Record<ThemeName, string> = {
  green: 'Emerald',
  blue: 'Sapphire',
  purple: 'Amethyst',
  rose: 'Rose',
  orange: 'Amber',
  cyan: 'Cyan',
}

export const themeNames: ThemeName[] = ['green', 'blue', 'purple', 'rose', 'orange', 'cyan']

const STORAGE_KEY = 'fluffwire-theme'
const currentTheme = ref<ThemeName>('green')

export function useTheme() {
  function setTheme(name: ThemeName) {
    const colors = themes[name]
    if (!colors) return

    const el = document.documentElement

    // Enable transition temporarily
    el.classList.add('theme-transitioning')

    for (const [prop, value] of Object.entries(colors)) {
      el.style.setProperty(prop, value)
    }

    currentTheme.value = name
    localStorage.setItem(STORAGE_KEY, name)

    import('@/stores/settings').then(({ useSettingsStore }) => {
      const settingsStore = useSettingsStore()
      if (settingsStore.isFetched) {
        settingsStore.updateSetting({ theme: name as 'dark' | 'light' })
      }
    })

    // Remove transition class after animation completes
    setTimeout(() => el.classList.remove('theme-transitioning'), 350)
  }

  function initTheme() {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null
    if (stored && themes[stored]) {
      // Apply without transition on init
      const colors = themes[stored]
      for (const [prop, value] of Object.entries(colors)) {
        document.documentElement.style.setProperty(prop, value)
      }
      currentTheme.value = stored
    }
  }

  return {
    theme: readonly(currentTheme),
    themes,
    themeLabels,
    themeNames,
    setTheme,
    initTheme,
  }
}
