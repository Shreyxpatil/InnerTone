# InnerTone - Detailed File Architecture & Explanation

This document provides a comprehensive breakdown of each and every file and folder in the `InnerTone` project. InnerTone is an AI-powered Mental Wellness Consultation Platform built using **FastAPI** (Backend) and **React/Vite** (Frontend).

---

## 🏗️ Root Directory (Setup & Configuration)

The root directory contains the necessary configuration files to run, build, and deploy the application.

*   **`README.md`**  
    The main project documentation giving an overview of InnerTone, its features, and basic setup instructions.
*   **`.env`**  
    Environment variables defining database credentials, API keys (especially `GEMINI_API_KEY`), and environment states (development/production).
*   **`.gitignore`**  
    Specifies intentionally untracked files (e.g., `.venv`, `node_modules`, `__pycache__`) that Git should ignore.
*   **`requirements.txt`**  
    A list of Python dependencies required by the backend, including `fastapi`, `sqlalchemy`, `google-genai`, `uvicorn`, and `langchain`.
*   **`init_db.py`**  
    A script that imports all SQLAlchemy database models and utilizes `Base.metadata.create_all` to automatically create empty tables in the PostgreSQL database.
*   **`run.py`**  
    The backend entry point. Running this script starts the FastAPI server using `uvicorn` on `localhost:8000`.
*   **`start.sh`**  
    A handy Bash script that concurrently starts both the FastAPI backend and the Vite React frontend. It manages background processes and auto-restarts the frontend if it crashes.
*   **`Dockerfile`**  
    Configures the backend environment in a Docker container. It uses `python:3.11-slim`, installs system dependencies, copies the source code, and sets `uvicorn` as the entry command.
*   **`docker-compose.yml`**  
    Orchestrates multi-container deployment. It runs two services: `web` (the InnerTone FastAPI server) and `db` (the PostgreSQL 16 database).

---

## ⚙️ Backend (`innertone/` Directory)

This directory contains the entire Python/FastAPI backend architecture, designed robustly with modular routing, database ORM, and LLM integrations.

### `innertone/` Root
*   **`main.py`**  
    The primary FastAPI application file. It sets up CORS middlewares, attaches the versioned API routers (chat, calls, booking), and defines a basic `/health` endpoint.

### `innertone/core/` (Core configs)
*   **`config.py`**  
    Uses Pydantic's `BaseSettings` to load and validate environment variables from `.env`, making configuration easily accessible across the app.
*   **`database.py`**  
    Sets up the async SQLAlchemy engine using PostgreSQL. It creates `AsyncSessionLocal` which provides database sessions per request, and initializes the `Base` declarative base class for the models.

### `innertone/models/` (Database Tables)
*   **`booking.py` (Appointment)**  
    Defines the `Appointment` ORM model, storing fields like `user_id`, `therapist_name`, `scheduled_at`, and `status`.
*   **`document_metadata.py` (DocumentMetadata)**  
    Stores metadata related to chunked documents used for RAG (Retrieval-Augmented Generation). It maps database rows to internal FAISS vector store IDs.
*   **`emotion.py` (EmotionRecord)**  
    Logs the user's emotional state over time. Contains fields representing detected `emotions`, `intensity`, and partial message snippets.
*   **`memory.py` (ConversationMessage)**  
    Stores chat conversation logs associating a `session_id` with either `user` or `model` (AI) messages for memory persistence.

### `innertone/schemas/` (Pydantic Validation)
*   **`booking.py`**  
    Pydantic schemas used to parse and validate JSON payloads for creating or returning appointment data.
*   **`chat.py`**  
    Pydantic schemas structuring the request (e.g., `ChatRequest`) and the AI's response format (e.g., `ChatResponse`), including embedded emotion and RAG source contexts.

### `innertone/api/v1/` (API Routers)
*   **`chat.py`**  
    Handles the traditional text-chat `/chat/` POST endpoint. It concurrently triggers both emotion detection and the CBT consultant engine, saves the conversation memory to Postgres, and returns the response payload.
*   **`calls.py`**  
    Handles Real-time WebSockets (`/calls/` routes).
    *   `/signaling/{id}`: Basic WebRTC room coordination.
    *   `/ai-voice/{id}`: Real-time WebSocket connection to the AI voice engine. It listens to client transcripts, runs the Consultant Engine, and returns AI text responses for text-to-speech.
*   **`booking.py`**  
    Standard REST endpoints (`GET`, `POST`, `DELETE`) for scheduling, viewing, and cancelling wellness appointments.

### `innertone/services/` (Business Logic Layer)
*   **`consultant.py`**  
    The core "brain" of the platform. It executes a 4-step CBT workflow: safety check, RAG context retrieval, prompt construction, and calling Google's Gemini models (via `google-genai`).
*   **`emotion.py`**  
    Integrates AI models to infer emotional states from user messages, returning structured tags like `anxious` or `sad` and their intensities.
*   **`memory.py`**  
    Functions to asynchronously fetch historical messages from the database and write new messages into it.
*   **`safety.py`**  
    Evaluates messages for self-harm or crisis keywords, returning a hard-coded or customized response directing users to immediate professional help when necessary.

### `innertone/rag/` (Retrieval-Augmented Generation)
*   **`ingest.py`**  
    The script responsible for parsing local psychology books (from `Books/`), chunking the text, computing vector embeddings, and saving them to the FAISS index database.
*   **`retrieve.py`**  
    Used by the consultant engine to query a user's prompt against the FAISS index, fetching the top semantics-matching book excerpts to ground the AI's response.

---

## 🎨 Frontend (`frontend/` Directory)

The UI is built using React, Vite for bundling, React Router for navigation, and Three.js (React Three Fiber) for 3D renderings.

### Configuration & Tooling
*   **`package.json` & `package-lock.json`**  
    Defines the frontend dependencies (React, Three.js, Lucide UI icons) and the available `npm` scripts like `dev` and `build`.
*   **`vite.config.js`**  
    Vite configuration settings indicating that the React plugin should be loaded during development and compilation.
*   **`eslint.config.js`**  
    Linting configs assuring best practices throughout the JS/JSX source code.

### Base Assets
*   **`index.html`**  
    The root HTML file outlining the root `<div id="root"></div>` where the React app handles the DOM tree.
*   **`public/` and `src/assets/`**  
    Contains static media files such as `.glb` models, 3D Avatars, task files, SVGs, and background layers necessary for the layout.

### Source Code (`src/`)

#### `index.css`
A global CSS stylesheet predominantly relying on raw CSS variables for custom styling. It employs modern UI techniques like "glassmorphism", custom gradients, animations, and color palettes optimized for mental well-being (e.g., `calm`, `sad`, `stressed` colors).

#### `main.jsx`
The React root file. It mounts the `App` component into the `index.html` base DOM node.

#### `App.jsx`
Sets up the overall page layout containing the left Sidebar (with navigation links using Lucide icons) and right Main Content area defined by `react-router-dom` dynamic Routes.

#### `pages/` (Application Views)
*   **`DashboardPage.jsx`**  
    The main landing view the user sees. It typically aggregates metrics, upcoming appointments, and provides quick navigation actions.
*   **`ChatPage.jsx`**  
    A text-based AI consultation interface. It handles messaging logic, dynamic UI styling (e.g., applying glowing backgrounds based on detected emotions), and "Crisis Mode" banner rendering if severe distress is detected.
*   **`VoiceCallPage.jsx`**  
    Provides a real-time hands-free communication layout. 
    It captures audio using `window.SpeechRecognition`, sends transcripts over WebSockets to `/api/v1/calls/ai-voice`, and utilizes Web Speech API (`window.speechSynthesis`) to audibly speak the AI's responses. Calculates user audio frequencies using an HTML5 Canvas visualizer.
*   **`VideoCallPage.jsx`**  
    The most advanced feature page. Features a deeply immersive split-screen format showing user's own webcam on the right and an AI Avatar on the left. Combines WebRTC capabilities, real-time audio visualization, TTS lip-sync logic, and live caption rendering.
*   **`BookingsPage.jsx`**  
    The scheduling and appointments dashboard where users can manage their meetings with therapists.

#### `components/` (Reusable UI Chunks)
*   **`Avatar3D.jsx`**  
    The core React Three Fiber engine responsible for rendering the 3D consultant model (`avatar.glb`).
    *   It parses skeletal `bones` and `morphTargetInfluences`.
    *   Uses a `useFrame` game loop to manipulate the model's visual representation at ~60fps continuously.
    *   Simulates natural `blinking`, computes multi-viseme (`A, O, P, E`, etc.) audio waveforms logic for **lip-sync**, orchestrates head micro-movements, and adds "breath" scaling to the spine structure—all of which creates a highly realistic, empathetic avatar presence.
