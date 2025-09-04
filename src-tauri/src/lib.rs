// src-tauri/src/lib.rs

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        // THIS IS THE CORRECTED, SIMPLER WAY TO INITIALIZE THE LOG PLUGIN
        .plugin(tauri_plugin_log::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}