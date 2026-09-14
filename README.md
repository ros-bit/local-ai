# Local AI

## 1. What Is Local AI?

Local AI is a personal, local AI chat application that runs on your own computer. It gives you a ChatGPT-style conversation interface, but the AI model does not live in a remote cloud service. Instead, it uses Ollama, which runs the model on your machine.

This project is designed for a single user on a local computer. The user types a prompt in the browser, the local backend sends it to Ollama, and Ollama generates a reply using the selected local model. The conversation interface is intentionally similar to a ChatGPT-like assistant, but it is not the same as using OpenAI or another hosted web service.

The application is meant to run locally, so the model works from your CPU/GPU and RAM. It is not a cloud API client. It helps with:

- chat-style conversation
- math that renders correctly
- code that displays in clean, readable blocks with syntax highlighting
- local storage of settings and conversation history on your own device

This project is not the same as using ChatGPT's cloud service. No remote AI API key is required for normal use, and the model runs on your own device rather than on a vendor's servers.

## 2. How It Works

```text
User
↓
Local AI Web Interface
↓
Local Backend (Python)
↓
Ollama
↓
gemma4:e2b
↓
CPU / GPU / RAM of your device
```

Here is what each part does:

- User: types a message in the browser.
- Local AI Web Interface: the frontend is a static HTML/CSS/JavaScript app in the frontend/ folder. It displays chat messages, settings, and conversation history.
- Local Backend: the backend/ folder contains a Python HTTP server. It handles the UI API, loads/saves conversation data, and talks to Ollama.
- Ollama: the model runner. It manages the AI model locally and exposes the local API.
- gemma4:e2b: this is the model configured in the project. It is pulled locally with Ollama and used for generation.
- CPU/GPU/RAM: the model runs on your computer resources, which is why performance depends on the hardware you have available.

The app also stores local conversation files in the data/conversations folder and settings in config/settings.json.

## 3. Requirements

### Hardware

- CPU: a modern CPU is fine; a stronger CPU helps with model speed.
- RAM: more RAM is better for local AI. Small or older devices may still run the app, but replies may be slower.
- Storage: you need enough free disk space for the model files. Models can take a large amount of local storage.
- GPU: a GPU is not required. This project can run with CPU-only inference through Ollama. If you have a capable GPU, it may improve performance.
- Internet: required for the initial setup, because you need to install Ollama and download the model.

### Software

- Operating system: Windows 10/11, macOS, or Linux.
- Python: Python 3.10 or newer is required.
- Git: recommended for cloning the project from GitHub.
- Ollama: required.
- Model: gemma4:e2b is the configured model for this project.
- No Node.js is required. This project does not use npm or a JavaScript build pipeline.
- No database server is required. Conversations are saved as JSON files locally.

### Performance note

Local AI performance depends heavily on:

- RAM available to the model
- CPU speed and core count
- GPU/VRAM if present
- model size
- context length
- other programs running at the same time

A weaker computer may still run the project, but responses can be slower and generation may take longer. This is normal for local AI.

## 4. Supported Operating Systems

### Windows

1. Install Git if you do not already have it.
   - Download Git from https://git-scm.com/download/win
   - Or install it with winget:

   ```powershell
   winget install --id Git.Git -e
   ```

2. Install Python 3.10+ if it is not already installed.
   - Download from https://www.python.org/downloads/windows/
   - Or use winget:

   ```powershell
   winget install --id Python.Python.3.12 -e
   ```

3. Install Ollama.
   - Download from https://ollama.com/download/windows
   - Or install it from the Ollama website and follow the setup steps.

4. Open PowerShell or Command Prompt in a folder where you want to store the project.

5. Clone the repository:

   ```powershell
   git clone <repository-url>
   cd <project-folder>
   ```

   If the folder name is local-ai, the second command is usually:

   ```powershell
   cd local-ai
   ```

6. Install Python dependencies.

   ```powershell
   python -m pip install -r requirements.txt
   ```

   This project does not require extra third-party Python packages, but this command is still the correct step.

7. Start Ollama if it is not already running.

   ```powershell
   ollama serve
   ```

   Leave that terminal open while using the app.

8. Pull the model:

   ```powershell
   ollama pull gemma4:e2b
   ```

9. Start the application:

   ```powershell
   python backend/main.py
   ```

   If your Python command is `py` instead of `python`, use:

   ```powershell
   py backend\main.py
   ```

10. Open your browser and go to:

   ```text
   http://127.0.0.1:8000
   ```

11. To stop the app, press Ctrl+C in the terminal where it is running.

### macOS

1. Install Git if needed.

   ```bash
   git --version
   ```

   If Git is missing, install Xcode Command Line Tools or Git from https://git-scm.com/download/mac.

2. Install Python 3.10+.

   ```bash
   python3 --version
   ```

   If Python is not installed, install it from python.org or use Homebrew:

   ```bash
   brew install python
   ```

3. Install Ollama.
   - Download from https://ollama.com/download/mac
   - Or use the installer from the Ollama site.

4. Open Terminal.

5. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

   Example if the folder is named local-ai:

   ```bash
   cd local-ai
   ```

6. Install the project's Python requirements:

   ```bash
   python3 -m pip install -r requirements.txt
   ```

7. Start Ollama if it is not already running:

   ```bash
   ollama serve
   ```

8. Pull the model:

   ```bash
   ollama pull gemma4:e2b
   ```

9. Start the application:

   ```bash
   python3 backend/main.py
   ```

10. Open your browser and go to:

   ```text
   http://127.0.0.1:8000
   ```

11. To stop the app, press Ctrl+C in the terminal.

### Linux

1. Install Git if needed.

   ```bash
   sudo apt update
   sudo apt install git
   ```

   If you use another Linux distribution, install Git using that distribution's package manager.

2. Install Python 3.10+.

   ```bash
   sudo apt install python3 python3-pip
   ```

3. Install Ollama.
   - Follow the Linux installation instructions from https://ollama.com/download/linux
   - Typical install steps are documented on the Ollama website for your distribution.

4. Open Terminal.

5. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

   Example:

   ```bash
   cd local-ai
   ```

6. Install the project's Python requirements:

   ```bash
   python3 -m pip install -r requirements.txt
   ```

7. Start Ollama if it is not already running:

   ```bash
   ollama serve
   ```

8. Pull the model:

   ```bash
   ollama pull gemma4:e2b
   ```

9. Start the application:

   ```bash
   python3 backend/main.py
   ```

10. Open your browser and go to:

   ```text
   http://127.0.0.1:8000
   ```

11. To stop the app, press Ctrl+C in the terminal.

Windows uses `python` or `py` and backslashes in file paths. macOS and Linux usually use `python3` and forward slashes. The app itself is the same across platforms.

## 5. BEFORE DOWNLOADING AND RUNNING

Use this checklist before you begin:

- [ ] Check supported OS
- [ ] Check RAM
- [ ] Check available storage
- [ ] Check CPU/GPU requirements
- [ ] Install required software
- [ ] Install Ollama
- [ ] Make sure Ollama is available
- [ ] Make sure enough storage is available for the model
- [ ] Have internet access for the initial download/setup
- [ ] Clone/download the GitHub repository

Why each item matters:

- Check supported OS: the project runs on Windows, macOS, and Linux, but the setup commands differ slightly.
- Check RAM: local AI uses a lot of memory. More RAM means smoother responses.
- Check available storage: the model can consume several gigabytes of local disk space.
- Check CPU/GPU requirements: the app does not require a GPU, but a stronger CPU or GPU can significantly improve speed.
- Install required software: Python and Ollama are required for the project to work.
- Install Ollama: the model is served by Ollama, so it must be installed and running.
- Make sure Ollama is available: the app checks the local Ollama service at http://127.0.0.1:11434.
- Make sure enough storage is available for the model: the chosen model is downloaded locally and stored on your device.
- Have internet access for the initial download/setup: this is needed to install Ollama and download the model.
- Clone/download the GitHub repository: you need the actual project files before you can run the app.

## 6. Installation

### Step 1: Install Git

Git is helpful for cloning the project from GitHub. If you already have Git installed, you can skip this step.

Check if Git is available:

```bash
git --version
```

If it is not installed, install it from the official Git website or using your operating system's package manager.

### Step 2: Clone the repository

From your terminal, clone the repository and enter the project folder:

```bash
git clone <repository-url>
cd <project-folder>
```

If the local folder is named local-ai:

```bash
cd local-ai
```

### Step 3: Install required runtimes

This project requires Python 3.10 or newer.

Check Python:

```bash
python3 --version
```

On Windows, you may use:

```powershell
python --version
```

If Python is missing, install it before continuing.

This project does not require Node.js. There is no npm install step.

### Step 4: Install dependencies

From the project root, run:

```bash
python3 -m pip install -r requirements.txt
```

On Windows:

```powershell
python -m pip install -r requirements.txt
```

The project's requirements file is intentionally minimal. This project uses Python's standard library and does not need extra third-party packages.

### Step 5: Install Ollama

Install Ollama from the official Ollama website:

- Windows: https://ollama.com/download/windows
- macOS: https://ollama.com/download/mac
- Linux: https://ollama.com/download/linux

After installation, verify Ollama is working:

```bash
ollama --version
```

Then start the service:

```bash
ollama serve
```

Keep that terminal running while the app is in use.

### Step 6: Download the AI model

This project is configured to use the model `gemma4:e2b`.

Download it with:

```bash
ollama pull gemma4:e2b
```

This step requires internet access and uses local storage on your machine. The model files are stored on your device, not in the cloud.

### Step 7: Verify installation

Run these checks:

```bash
git --version
python3 --version
ollama --version
ollama list
```

You should see the `gemma4:e2b` model in the output from `ollama list`.

You can also confirm the project files are present by listing the directory:

```bash
ls
```

The project should include the folders `backend/`, `frontend/`, `config/`, and `data/`.

## 7. Start the Application

Before starting the app, make sure Ollama is running:

```bash
ollama serve
```

Then start the Local AI backend from the project root.

### Windows

Open PowerShell in the project folder and run:

```powershell
python backend\main.py
```

Or:

```powershell
py backend\main.py
```

### macOS

Open Terminal in the project folder and run:

```bash
python3 backend/main.py
```

### Linux

Open Terminal in the project folder and run:

```bash
python3 backend/main.py
```

### What successful startup looks like

The server prints a message similar to:

```text
Local AI running at http://127.0.0.1:8000
```

This means the app is running locally and is ready to serve the web interface.

### Open it in the browser

Open this address in a browser:

```text
http://127.0.0.1:8000
```

If the browser does not open automatically, open it manually.

### If Ollama is not running

The app checks the local Ollama API at `http://127.0.0.1:11434`. If Ollama is not running, you will see a warning in the app and generation will fail until the service is started.

Start it with:

```bash
ollama serve
```

### If the model is missing

If the app says the selected model is not installed, run:

```bash
ollama pull gemma4:e2b
```

### Stop the application

To stop the app, press Ctrl+C in the terminal running the Python server.

## 8. First Run

The first time you start the application:

- the backend starts a local web server on port 8000 by default
- the frontend loads from the local `frontend/` folder
- the app checks whether Ollama is available
- the app checks whether the configured model `gemma4:e2b` exists locally
- the browser loads the chat UI and shows the conversation list panel

If everything is installed correctly, you can begin chatting immediately. If not, the app will tell you what is missing, usually either:

- Ollama is not running
- the model `gemma4:e2b` is not installed

The app stores conversation history in local JSON files under `data/conversations/`. The app also keeps configuration in `config/settings.json`, including the model name, temperature, output limits, theme, and other local settings.

This project is intended to be local and private: your conversations are stored on your own device and are not sent to a cloud service unless you explicitly change the backend behavior.
