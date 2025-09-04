use std::path::PathBuf;
use std::env;
use std::fs;

fn main() {
    tauri_build::build();

    if env::var("PROFILE").unwrap() == "debug" {
        // Define the source directory of your Llama.cpp files
        let src_dir = PathBuf::from("../llama-cpp");

        // Define the destination directory inside `target/debug`
        let dest_dir = PathBuf::from("target/debug");

        // Tell Cargo to rerun this build script if the source directory changes.
        println!("cargo:rerun-if-changed={}", src_dir.display());

        // Read all entries in the source directory
        let entries = fs::read_dir(&src_dir)
            .expect(&format!("Failed to read source directory {:?}", src_dir));

        // Iterate over each file/folder in the source directory
        for entry in entries {
            let entry = entry.expect("Failed to read directory entry");
            let src_path = entry.path();
            
            // Only copy files, not sub-directories
            if src_path.is_file() {
                // Construct the destination path for this specific file
                let dest_path = dest_dir.join(src_path.file_name().unwrap());

                // Copy the file
                fs::copy(&src_path, &dest_path)
                    .expect(&format!("Failed to copy sidecar dependency from {:?} to {:?}", src_path, dest_path));
            }
        }
    }
}