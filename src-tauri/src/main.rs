#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};

fn lock_path() -> PathBuf {
    std::env::temp_dir().join("kaizen.lock")
}

fn is_another_instance_running() -> bool {
    use std::io::Write;
    let path = lock_path();
    // create_new is atomic — fails iff the file already exists
    match std::fs::OpenOptions::new().create_new(true).write(true).open(&path) {
        Ok(mut f) => {
            let _ = write!(f, "{}", std::process::id());
            false
        }
        Err(_) => {
            // Lock file exists — check if the owning process is still alive
            if let Ok(pid_str) = fs::read_to_string(&path) {
                if let Ok(pid) = pid_str.trim().parse::<i32>() {
                    if std::path::Path::new(&format!("/proc/{}", pid)).exists() {
                        return true;
                    }
                }
            }
            // Stale lock — remove it and retry once
            let _ = fs::remove_file(&path);
            match std::fs::OpenOptions::new().create_new(true).write(true).open(&path) {
                Ok(mut f) => {
                    let _ = write!(f, "{}", std::process::id());
                    false
                }
                Err(_) => true,
            }
        }
    }
}

#[tauri::command]
fn open_overlay(app: tauri::AppHandle) {
  if let Some(window) = app.get_webview_window("overlay") {
    let _ = window.show();
    let _ = window.set_focus();
    return;
  }

  let _ = WebviewWindowBuilder::new(
    &app,
    "overlay",
    WebviewUrl::App("/overlay".into()),
  )
  .title("Pomodoro Overlay")
  .always_on_top(true)
  .transparent(true)
  .decorations(false)
  .resizable(true)
  .inner_size(240.0, 160.0)
  .min_inner_size(240.0, 160.0)
  .build();
}

fn main() {
  if is_another_instance_running() {
    std::process::exit(0);
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      let show_item = MenuItem::with_id(app, "show", "Apri", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Esci", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

      let icon_data = include_bytes!("../icons/icon.png");
      let decoded = image::load_from_memory(icon_data)
          .expect("failed to decode tray icon")
          .into_rgba8();
      let (w, h) = (decoded.width(), decoded.height());
      let icon = tauri::image::Image::new_owned(decoded.into_raw(), w, h);

      let tray_builder = TrayIconBuilder::new()
        .tooltip("Kaizen改善")
        .icon(icon)
        .menu(&menu)
        .on_menu_event(|app: &tauri::AppHandle, event: tauri::menu::MenuEvent| {
          match event.id().as_ref() {
            "show" => {
              if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
            "quit" => {
              app.exit(0);
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event: TrayIconEvent| {
          if let TrayIconEvent::Click { .. } = event {
            if let Some(window) = tray.app_handle().get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
        });

      let _ = tray_builder.build(app);

      Ok(())
    })
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        if window.label() == "main" {
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .invoke_handler(tauri::generate_handler![open_overlay])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
