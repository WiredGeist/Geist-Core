// src-tauri/src/main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// --- IMPORTS ---
use reqwest::Client;
use serde::{Deserialize, Serialize};
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
#[derive(Clone, Serialize)]
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

#[derive(Deserialize, Debug)]
struct EmbeddingObject {
    embedding: Vec<Vec<f32>>,
}
#[derive(Deserialize, Debug)]
#[serde(transparent)]
struct EmbeddingApiResponse(Vec<EmbeddingObject>);

// --- OLLAMA STRUCTS ---
#[derive(Serialize, Deserialize, Debug)]
struct OllamaModel {
    name: String,
    modified_at: String,
    size: u64,
}

#[derive(Deserialize, Debug)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

// --- NEW STRUCTS FOR OLLAMA CHAT ---
#[derive(Serialize, Deserialize, Debug)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Serialize, Debug)]
struct OllamaChatPayload {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
}

#[derive(Deserialize, Debug)]
struct OllamaChatResponse {
    message: OllamaMessage,
}


// --- GEMINI / GOOGLE STRUCTS ---
#[derive(Serialize, Deserialize, Debug, Clone)]
struct GoogleModel {
    name: String,
    #[serde(rename = "supportedGenerationMethods")]
    supported_generation_methods: Vec<String>,
}

#[derive(Deserialize, Debug)]
struct GoogleModelListResponse {
    models: Vec<GoogleModel>,
}

#[derive(Deserialize, Debug)]
struct GeminiPart {
    text: String,
}

#[derive(Deserialize, Debug)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Deserialize, Debug)]
struct GeminiCandidate {
    content: GeminiContent,
}

#[derive(Deserialize, Debug)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}


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

// --- CORE TAURI COMMANDS ---

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

// --- OLLAMA COMMANDS ---
#[tauri::command]
async fn list_ollama_models(ollama_url: String) -> Result<Vec<OllamaModel>, String> {
    let client = Client::new();
    let endpoint = format!("{}/api/tags", ollama_url.trim_end_matches('/'));
    let res = client.get(&endpoint).send().await.map_err(|e| format!("Failed to send request to Ollama: {}", e))?;
    if res.status().is_success() {
        let response_body = res.json::<OllamaTagsResponse>().await.map_err(|e| format!("Failed to parse Ollama response: {}", e))?;
        Ok(response_body.models)
    } else {
        Err(format!("Ollama server error ({}): {}", res.status(), res.text().await.unwrap_or_default()))
    }
}

#[tauri::command]
async fn load_ollama_model(ollama_url: String, model_name: String) -> Result<(), String> {
    let client = Client::new();
    let endpoint = format!("{}/api/chat", ollama_url.trim_end_matches('/'));
    let body = json!({ "model": model_name, "messages": [{"role": "user", "content": " "}], "stream": false, "keep_alive": "5m" });
    let res = client.post(&endpoint).json(&body).timeout(Duration::from_secs(600)).send().await.map_err(|e| format!("Failed to send 'load' request to Ollama: {}", e))?;
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

// --- NEW OLLAMA CHAT COMMAND ---
#[tauri::command]
async fn call_ollama_api(ollama_url: String, model: String, messages_json: String) -> Result<String, String> {
    let messages: Vec<OllamaMessage> = serde_json::from_str(&messages_json)
        .map_err(|e| format!("Failed to parse message history: {}", e))?;
    
    let client = Client::new();
    let endpoint = format!("{}/api/chat", ollama_url.trim_end_matches('/'));

    let payload = OllamaChatPayload {
        model,
        messages,
        stream: false,
    };

    let res = client.post(&endpoint).json(&payload).send().await
        .map_err(|e| format!("Failed to send request to Ollama: {}", e))?;
    
    if res.status().is_success() {
        let response_body = res.json::<OllamaChatResponse>().await
            .map_err(|e| format!("Failed to parse Ollama chat response: {}", e))?;
        Ok(response_body.message.content)
    } else {
        Err(format!("Ollama server error ({}): {}", res.status(), res.text().await.unwrap_or_default()))
    }
}

// --- GEMINI / GOOGLE COMMANDS ---
#[tauri::command]
async fn list_google_models(api_key: String) -> Result<Vec<GoogleModel>, String> {
    let client = Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);
    let res = client.get(&url).send().await.map_err(|e| format!("Failed to send request to Google API: {}", e))?;

    if res.status().is_success() {
        let data = res.json::<GoogleModelListResponse>().await.map_err(|e| format!("Failed to parse Google API response: {}", e))?;
        let filtered_models = data.models.into_iter().filter(|model|
            model.supported_generation_methods.contains(&"generateContent".to_string()) &&
            !model.name.contains("embedding") && !model.name.contains("image") &&
            !model.name.contains("video") && !model.name.contains("aqa") &&
            !model.name.contains("pro-") && model.name.contains("gemini")
        ).collect();
        Ok(filtered_models)
    } else {
        let status = res.status();
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown server error".to_string());
        Err(format!("Google API failed with status {}: {}", status, error_text))
    }
}

#[tauri::command]
async fn call_gemini_api(api_key: String, model: String, prompt: String) -> Result<String, String> {
    let client = Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model, api_key);
    let payload = json!({ "contents": [{ "parts": [{ "text": prompt }] }] });
    let res = client.post(&url).json(&payload).send().await.map_err(|e| format!("Failed to send request to Google API: {}", e))?;
    if res.status().is_success() {
        match res.json::<GeminiResponse>().await {
            Ok(data) => {
                if let Some(candidate) = data.candidates.into_iter().next() {
                    if let Some(part) = candidate.content.parts.into_iter().next() {
                        Ok(part.text)
                    } else { Err("Gemini API response was missing 'parts'.".to_string()) }
                } else { Err("Gemini API response was missing 'candidates'.".to_string()) }
            }
            Err(e) => Err(format!("Failed to parse JSON from Google API: {}", e)),
        }
    } else {
        let status = res.status();
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown server error".to_string());
        Err(format!("Google API failed with status {}: {}", status, error_text))
    }
}


// --- LLAMA.CPP COMMANDS ---
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

    // --- THIS IS THE CORRECTED CODE ---
    let (mut rx, child) = app.shell()
        .sidecar("llama-server.exe").map_err(|e| e.to_string())?
        .args(&sidecar_args)
        .spawn().map_err(|e| e.to_string())?;
    // ------------------------------------

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
        .plugin(tauri_plugin_http::init())
        .manage(state)
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
            // Core Commands
            index_file,
            retrieve_context,
            clear_rag_context,
            open_file_dialog,
            // Llama.cpp Commands
            start_llama_server,
            stop_llama_server,
            // Ollama Commands
            list_ollama_models,
            load_ollama_model,
            unload_ollama_model,
            call_ollama_api,    // <-- THE FIX
            // Gemini Commands
            list_google_models,
            call_gemini_api
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}