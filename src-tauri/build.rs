// src-tauri/build.rs

use std::env;
use std::fs;
use std::path::Path;

fn main() {
    tauri_build::build();

    // Define the source directory relative to the `src-tauri` folder.
    let src_dir = Path::new("../llama-cpp");

    // We only proceed if the source directory actually exists.
    if src_dir.exists() && src_dir.is_dir() {
        // Get the output directory from the environment variable Cargo sets.
        // This is a temporary directory like `target/release/build/geist-core-RANDOM_HASH/out`
        let out_dir = env::var("OUT_DIR").unwrap();

        // The final executables/DLLs need to go next to your app's .exe.
        // This path navigates from the temporary `out` dir up to the root of the target folder
        // (e.g., `target/release/` or `target/debug/`). This is a reliable method.
        let dest_path = Path::new(&out_dir).join("../../..");

        println!("cargo:rerun-if-changed={}", src_dir.display());

        // Iterate over each file in the source directory.
        for entry in fs::read_dir(src_dir).unwrap() {
            let entry = entry.unwrap();
            let src_path = entry.path();
            
            // Only copy files, not sub-directories.
            if src_path.is_file() {
                let dest_file = dest_path.join(src_path.file_name().unwrap());

                // Tell Cargo to re-run this script if the source file changes.
                println!("cargo:rerun-if-changed={}", src_path.display());
                
                // Copy the file to the final destination.
                fs::copy(&src_path, &dest_file).unwrap_or_else(|err| {
                    panic!("Failed to copy file from {} to {}: {}", src_path.display(), dest_file.display(), err);
                });
            }
        }
    }
}