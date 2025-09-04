// src-tauri/src/main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// --- IMPORTS ---
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

// --- STATE MANAGEMENT ---
#[derive(Clone, serde::Serialize)]
pub struct DocumentChunk {
    content: String,
    embedding: Vec<f32>,
}

pub struct AppState {
    pub llama_server_handle: Mutex<Option<CommandChild>>,
    pub vector_store: Mutex<Vec<DocumentChunk>>,
}

// --- STRUCTS FOR PARSING ---
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartServerArgs {
    model_path: String,
    gpu_layers: u32,
    context_size: u32,
    threads: u32,
    flash_attn: bool,
    main_gpu: u32,
    tensor_split: Option<String>,
    embedding: bool,
}

// THIS IS THE CORRECT, ORIGINAL STRUCT FOR PARSING THE SERVER'S RESPONSE
#[derive(Deserialize, Debug)]
struct EmbeddingObject {
    embedding: Vec<Vec<f32>>,
}
#[derive(Deserialize, Debug)]
#[serde(transparent)]
struct EmbeddingApiResponse(Vec<EmbeddingObject>);


// --- HELPER FUNCTIONS ---

fn chunk_text(text: &str, chunk_size: usize, chunk_overlap: usize) -> Vec<String> {
    if text.len() <= chunk_size {
        return vec![text.to_string()];
    }
    let mut chunks = Vec::new();
    let chars: Vec<char> = text.chars().collect();
    let mut start = 0;
    while start < chars.len() {
        let end = std::cmp::min(start + chunk_size, chars.len());
        let chunk: String = chars[start..end].iter().collect();
        chunks.push(chunk);
        if end == chars.len() { break; }
        start += chunk_size - chunk_overlap;
    }
    chunks
}

// THIS HELPER NOW USES THE CORRECT PARSING LOGIC
async fn get_embedding_for_text(text: &str) -> Result<Vec<f32>, String> {
    let client = Client::new();
    let payload = json!({ "content": text });
    let response = client.post("http://localhost:8080/embedding").json(&payload).send().await
        .map_err(|e| format!("Failed to send request to llama-server: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown server error".to_string());
        return Err(format!("llama-server failed with status {}: {}", status, error_text));
    }

    match response.json::<EmbeddingApiResponse>().await {
        Ok(mut data) => {
            if let Some(mut first_obj) = data.0.pop() {
                if let Some(embedding_vec) = first_obj.embedding.pop() {
                    if !embedding_vec.is_empty() { Ok(embedding_vec) }
                    else { Err("Server returned an empty embedding vector.".to_string()) }
                } else { Err("The inner 'embedding' array was empty.".to_string()) }
            } else { Err("The top-level JSON array was empty.".to_string()) }
        }
        Err(e) => Err(format!("Failed to parse JSON from embedding server. Error: {}", e)),
    }
}

fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.is_empty() || v1.len() != v2.len() { return 0.0; }
    let dot_product: f32 = v1.iter().zip(v2).map(|(x, y)| x * y).sum();
    let norm_v1 = v1.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
    let norm_v2 = v2.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
    if norm_v1 == 0.0 || norm_v2 == 0.0 { 0.0 } else { dot_product / (norm_v1 * norm_v2) }
}

// --- TAURI COMMANDS ---

#[tauri::command]
async fn index_file(content: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut new_chunks = Vec::new();
    let chunks = chunk_text(&content, 512, 50);

    for chunk_content in chunks {
        let embedding = get_embedding_for_text(&chunk_content).await?;
        new_chunks.push(DocumentChunk { content: chunk_content, embedding });
    }

    state.vector_store.lock().unwrap().extend(new_chunks);
    Ok(())
}

#[tauri::command]
async fn retrieve_context(query: String, state: State<'_, AppState>) -> Result<String, String> {
    let query_embedding = get_embedding_for_text(&query).await?;
    let vector_store = state.vector_store.lock().unwrap();

    if vector_store.is_empty() { return Ok("".to_string()); }

    let mut scored_chunks: Vec<(f32, String)> = vector_store.iter()
        .map(|chunk| (cosine_similarity(&query_embedding, &chunk.embedding), chunk.content.clone()))
        .collect();

    scored_chunks.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
    
    let final_context = scored_chunks.into_iter().take(3)
        .map(|(_, content)| content)
        .collect::<Vec<String>>()
        .join("\n\n---\n\n");

    Ok(final_context)
}

#[tauri::command]
fn clear_rag_context(state: State<AppState>) -> Result<(), String> {
    state.vector_store.lock().unwrap().clear();
    Ok(())
}

#[tauri::command]
fn open_file_dialog(app: AppHandle) -> Option<String> {
    app.dialog().file().add_filter("GGUF Models", &["gguf"]).blocking_pick_file().map(|path| path.to_string())
}

#[tauri::command]
async fn load_ollama_model(ollama_url: String, model_name: String) -> Result<(), String> {
    let client = Client::new();
    let endpoint = format!("{}/api/chat", ollama_url.trim_end_matches('/'));
    let body = json!({ "model": model_name, "messages": [{"role": "user", "content": " "}], "stream": false, "keep_alive": "5m" });
    let res = client.post(&endpoint).json(&body).timeout(Duration::from_secs(600)).send().await
        .map_err(|e| format!("Failed to send 'load' request to Ollama: {}", e))?;
    if res.status().is_success() { Ok(()) } else {
        Err(format!("Ollama server error ({}): {}", res.status(), res.text().await.unwrap_or_default()))
    }
}

#[tauri::command]
async fn unload_ollama_model(ollama_url: String, model_name: String) -> Result<(), String> {
    if model_name.is_empty() { return Ok(()); }
    let client = Client::new();
    let url = format!("{}/api/generate", ollama_url.trim_end_matches('/'));
    let payload = json!({ "model": model_name, "prompt": " ", "stream": false, "keep_alive": "0s" });
    client.post(&url).json(&payload).send().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn start_llama_server(app: AppHandle, state: State<'_, AppState>, args: StartServerArgs) -> Result<(), String> {
    stop_llama_server(state.clone())?;
    let mut sidecar_args = vec![
        "-m".to_string(), args.model_path,
        "--port".to_string(), "8080".to_string(),
        "-c".to_string(), args.context_size.to_string(),
        "-t".to_string(), args.threads.to_string(),
        "-ngl".to_string(), args.gpu_layers.to_string(),
        "-mg".to_string(), args.main_gpu.to_string(),
    ];

    if args.embedding {
        sidecar_args.push("--embedding".to_string());
        sidecar_args.push("--pooling".to_string());
        sidecar_args.push("cls".to_string());
        sidecar_args.push("-ub".to_string());
        sidecar_args.push("8192".to_string());
    }

    if args.flash_attn { sidecar_args.push("-fa".to_string()); }
    if let Some(split) = args.tensor_split {
        if !split.trim().is_empty() { sidecar_args.extend(vec!["-ts".to_string(), split]); }
    }
    let (mut rx, child) = app.shell().sidecar("llama-server.exe").map_err(|e| e.to_string())?.args(&sidecar_args).spawn().map_err(|e| e.to_string())?;
    *state.llama_server_handle.lock().unwrap() = Some(child);
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stderr(bytes) = event {
                eprintln!("[llama-server-stderr] {}", String::from_utf8_lossy(&bytes));
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn stop_llama_server(state: State<AppState>) -> Result<(), String> {
    if let Some(child) = state.llama_server_handle.lock().unwrap().take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// --- MAIN FUNCTION & APP SETUP ---
fn main() {
    let state = AppState {
        llama_server_handle: Mutex::new(None),
        vector_store: Mutex::new(Vec::new()),
    };
    tauri::Builder::default()
        .manage(state)
        // REMOVED: The .setup hook with the "tauri://close-requested" listener is gone.
        // .setup(|app| { ... })

        // ADDED: This is the more reliable shutdown hook.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                println!("[Tauri] Main window closing, ensuring llama.cpp server is stopped.");
                let state: State<AppState> = window.app_handle().state();
                if let Err(e) = stop_llama_server(state.clone()) {
                    eprintln!("[Tauri] Failed to stop llama.cpp server on exit: {}", e);
                } else {
                    println!("[Tauri] Successfully sent stop command to server on exit.");
                }
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            start_llama_server,
            stop_llama_server,
            load_ollama_model,
            unload_ollama_model,
            index_file,
            retrieve_context,
            clear_rag_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}