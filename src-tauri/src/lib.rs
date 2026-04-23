use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Yerel dosya seçici ile tek bir PDF seçer (yerel yol döner).
#[tauri::command]
fn pick_pdf(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .set_title("PDF seç")
        .blocking_pick_file();
    Ok(match picked {
        Some(fp) => {
            let pb = fp.into_path().map_err(|e| e.to_string())?;
            Some(pb.to_string_lossy().into_owned())
        }
        None => None,
    })
}

/// PDF'yi uygulama veri dizinine kopyalar; dönen yol veritabanına yazılır.
#[tauri::command]
async fn copy_to_appdata(app: tauri::AppHandle, src: String) -> Result<String, String> {
    let src_path = PathBuf::from(&src);
    if !src_path.is_file() {
        return Err("Kaynak dosya bulunamadı.".into());
    }
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let dest_dir = base.join("pdfs");
    tokio::fs::create_dir_all(&dest_dir)
        .await
        .map_err(|e| e.to_string())?;

    let ext = src_path
        .extension()
        .and_then(|s| s.to_str())
        .filter(|e| !e.is_empty())
        .unwrap_or("pdf");
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let dest = dest_dir.join(format!("{stamp}.{ext}"));
    tokio::fs::copy(&src_path, &dest)
        .await
        .map_err(|e| e.to_string())?;
    dest
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Geçersiz hedef yolu.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![greet, pick_pdf, copy_to_appdata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
