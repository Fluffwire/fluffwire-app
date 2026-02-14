import { isTauri } from '@/utils/platform'

export async function checkForUpdates() {
  if (!isTauri()) return

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const { ask } = await import('@tauri-apps/plugin-dialog')
    const { relaunch } = await import('@tauri-apps/plugin-process')

    const update = await check()
    
    if (update) {
      console.log(`Update available: ${update.version}`)
      
      const yes = await ask(
        `Update to version ${update.version} is available!\n\nRelease notes:\n${update.body}\n\nWould you like to install it now?`,
        {
          title: 'Update Available',
          kind: 'info',
          okLabel: 'Update',
          cancelLabel: 'Later'
        }
      )
      
      if (yes) {
        console.log('Downloading update...')
        await update.downloadAndInstall()
        
        await ask(
          'Update installed! The app will now restart.',
          { title: 'Update Complete', kind: 'info' }
        )
        
        await relaunch()
      }
    } else {
      console.log('App is up to date')
    }
  } catch (error) {
    console.error('Update check failed:', error)
  }
}
