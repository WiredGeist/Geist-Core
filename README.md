
# GEIST CORE

<p align="center">
<img src="public/icon.png" alt="Geist Core Logo" width="150">
</p>

### Your Models. Your Data. Your Chat UI.

---

### SO, WHAT IS GEIST CORE?

**Ever wanted a single, powerful chat UI for all your different AI models, but got tired of being locked into someone else's cloud? Me too.**

**That's why I built Geist Core.**

 **I'm a developer and creator who loves tinkering with AI, but I wanted a tool that gave me** **total control**. A place where I could throw a 30GB local GGUF model, hook into my Ollama server, and ping the Gemini API, all from the same interface, without my data ever leaving my machine.

<p align="center">
<img src="public/Main_Chat.png" alt="Geist Core Chat Interface" width="700">
</p>

**Geist Core is that tool.** **It's the foundational, open-source version of my dream AI chat app, and I'm sharing it with you. This is for all of us who believe in the power of local AI and want a playground to unleash it.**

**This project is, and will always be, open source. It's the blueprint for everything that comes next.**

---

### IMPORTANT NOTES FOR V1.0.0

* **Platform:** **This initial release has been developed and tested primarily on** **Windows 11 (64-bit)**. While it may work on other systems, it is not officially supported at this time.
* **Release Files:** **You can either download the simple** **.exe** **installer or build the project from the source code. Instructions for both are below.**

---

### GETTING STARTED (FOR USERS)

**This is the easy way to get started. These instructions are for using the pre-built application.**

* **Go to the Releases Page:** **Navigate to the official GitHub releases page for Geist Core.**
* **Download the Installer:** **Find the latest release and download the** **.zip** **file that contains the installer (e.g.,** **Geist-Core-v1.0.0-windows-x64-setup.zip**).
* **Extract and Install:** **Unzip the downloaded file. Inside, you will find a setup file (e.g.,** **Geist Core_1.0.0_x64-setup.exe**). Double-click this installer and follow the on-screen instructions.

**The application is now installed! The required** **llama-server.exe** **is bundled, so you don't need to download it separately. Just head to the "Configuration Guide" section below to set up your models.**

---

### BUILDING FROM SOURCE (FOR DEVELOPERS)

**If you want to tinker with the code or build the app yourself, this section is for you.**

#### PREREQUISITES

* **Node.js:** [https://nodejs.org/en/download/](https://www.google.com/url?sa=E&q=https%3A%2F%2Fnodejs.org%2Fen%2Fdownload%2F) **(LTS version recommended)**
* **Rust:** [https://rustup.rs](https://www.google.com/url?sa=E&q=https://rustup.rs/)
* **Llama.cpp:** **You must place the pre-compiled binaries in a folder named** **llama-cpp** **in the project root.**

  * **Download from:** [https://github.com/ggerganov/llama.cpp/releases](https://www.google.com/url?sa=E&q=https%3A%2F%2Fgithub.com%2Fggerganov%2Fllama.cpp%2Freleases)

#### SETUP & RUN

* **Clone the Repository:**
  git clone https://github.com/WiredGeist/Geist-Core.git
* **Navigate into the Project:**
  cd Geist-Core
* **Install Dependencies:**
  npm install
* **Run in Development Mode:**
  For active development with hot-reloading.
  npm run tauri dev
* **Build the Final Application:**
  To build the final, optimized installers yourself, run this command:
  npm run tauri build

  **This will compile everything and place the final installers in the** **src-tauri/target/release/bundle/** **directory.**

---

### CONFIGURATION GUIDE

**First things first: you gotta tell Geist Core where your models are. Head over to the** **Settings** **page to get started.**

#### GGUF Models (Local & Offline)

* **Get Models:** **Download GGUF chat and embedding models from** [Hugging Face](https://www.google.com/url?sa=E&q=https%3A%2F%2Fhuggingface.co%2Fmodels).
* **Configure Paths:** **In Settings, use the "Browse" buttons under** **Model Providers** **and** **RAG Settings** **to select your downloaded model files.**

#### Ollama & Google Gemini

* **Get Keys/Servers Ready:** **Install Ollama and pull a model, or get your free Google AI API key.**
* **Configure:** **In Settings, enter your Ollama server address or paste in your Google AI key. Your models will now appear in the chat dropdown.**

---

### THE SETTINGS PANEL EXPLAINED

* **Hardware (Llama.cpp):** **A full suite of options to tune the performance of your local GGUF models. If you select** **CUDA**, you **must** **set the** **GPU Layers** **to 1 or more. For users without a powerful GPU,** **CPU Mode** **will offload the entire model to your system's RAM.**
* **Chat Memory:** **This toggle controls whether the app sends your previous messages in the current conversation as context.**
* **Danger Zone:** **The** **"Clear All Chat Data"** **button wipes all saved conversations. This cannot be undone.**

**Remember to hit** **"Save Changes"** **at the bottom after you've configured everything!**

---

### FUTURE PLANS (THE ROADMAP)

**This** **v1.0.0** **release is just the beginning. I have big plans for making Geist Core even more powerful. Here are some of the features I'm planning to integrate in future updates:**

* **Full Web Search Integration:** **Allow the AI to access the internet to answer questions about current events and provide up-to-date information.**
* **Text-to-Speech (TTS):** **Add a feature to have the AI's responses read aloud.**
* **Live Voice Chat:** **Integrate voice recognition and TTS for a full, hands-free conversational experience with the AI.**

**Stay tuned for these and many more improvements!** 

---

### LET'S CONNECT & BUILD TOGETHER

**This is a personal project, but I'm building it for the community. I share tools like this, and my journey building them, on my social channels.**

**If you dig what I'm doing, want to see what's next, or just want to support an indie dev, here's how:**

* **YouTube:** **I post videos about AI, development, and my projects here.**
  [https://www.youtube.com/@WiredGeist](https://www.google.com/url?sa=E&q=https%3A%2F%2Fwww.youtube.com%2F%40WiredGeist)
* **Star the Repo on GitHub:** **This is the best way to show your support and help others discover the project.**
  [https://github.com/WiredGeist](https://www.google.com/url?sa=E&q=https%3A%2F%2Fgithub.com%2FWiredGeist)
* **Follow My Work:** **I post about my projects, AI, and other tech explorations.**
  [https://www.wiredgeist.com/](https://www.google.com/url?sa=E&q=https%3A%2F%2Fwww.wiredgeist.com%2F)
* **Fuel the Next Update (Ko-fi):** **If Geist Core saves you time or you just think it's cool, consider buying me a coffee. It genuinely helps and is massively appreciated!**
  [https://ko-fi.com/wiredgeist](https://www.google.com/url?sa=E&q=https%3A%2F%2Fko-fi.com%2Fwiredgeist)

**Thanks for checking out my project. Let's see what you build with it.**

---

### LICENSE

**MIT License**
