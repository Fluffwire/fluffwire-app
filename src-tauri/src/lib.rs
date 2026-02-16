use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
fn was_started_hidden() -> bool {
    let args: Vec<String> = std::env::args().collect();
    args.contains(&"--hidden".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![was_started_hidden])
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;

                // Setup autostart plugin
                let autostart_manager = tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    Some(vec!["--hidden"]), // Start minimized to tray
                );
                app.handle().plugin(autostart_manager)?;

                // Enable auto-start by default on first run
                let manager = app.autolaunch();
                // Check if auto-start is already configured
                match manager.is_enabled() {
                    Ok(false) | Err(_) => {
                        // Not enabled or error checking - enable it by default
                        let _ = manager.enable();
                    }
                    Ok(true) => {
                        // Already enabled, do nothing
                    }
                }

                // Setup tray icon
                use tauri::{
                    menu::{Menu, MenuItem},
                    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
                };

                let show_item =
                    MenuItem::with_id(app, "show", "Show Fluffwire", true, None::<&str>)?;
                let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .show_menu_on_left_click(true)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;

                // Handle --hidden flag for auto-start
                let args: Vec<String> = std::env::args().collect();
                let is_hidden_start = args.contains(&"--hidden".to_string());

                // Intercept window close button (X) to minimize to tray instead
                if let Some(window) = app.get_webview_window("main") {
                    // If NOT started with --hidden flag (manual start), show immediately
                    // If started with --hidden (auto-start), frontend will decide based on user settings
                    if !is_hidden_start {
                        let _ = window.show();
                    }

                    let window_clone = window.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            // Prevent closing and hide to tray instead
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                    });
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
