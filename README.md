<div align="center">

# 🧠 InnerTone

### AI Mental Wellness Consultation Platform

**Built with FastAPI · PostgreSQL · FAISS · Google Gemini**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini-API-orange.svg)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen.svg)]()

> *InnerTone — because your mind deserves a thoughtful listener.*

</div>

---

## 🌟 What is InnerTone?

**InnerTone** is a production-grade AI mental-wellness consultation platform that combines state-of-the-art language models with evidence-based psychology knowledge (CBT, mindfulness, emotional intelligence) to deliver empathetic, intelligent, and safe mental health support.

It is **NOT** a medical application. It is a supportive, AI-powered companion grounded in psychology research.

---

## 🏗️ Architecture

```
Client (Web/Mobile)
        │
        ▼
 ┌──────────────────────────────────────────────┐
 │         FastAPI Backend (Async)               │
 │  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
 │  │  Chat    │  │  Booking  │  │Voice/Video│  │
 │  │ Service  │  │  Service  │  │ Signaling │  │
 │  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
 │       │              │              │          │
 │  ┌────▼─────────────────────────────▼─────┐   │
 │  │    LLM Consultant Engine (Gemini)       │   │
 │  │   ┌──────────┐    ┌─────────────────┐  │   │
 │  │   │   RAG    │    │ Memory System   │  │   │
 │  │   │ Pipeline │    │ (Long-term ctx) │  │   │
 │  │   └──────────┘    └─────────────────┘  │   │
 │  ├──────────────────────────────────────◄─┤   │
 │  │ Safety Detector │ Emotion Classifier   │   │
 │  └────────────────────────────────────────┘   │
 └──────────────────────────────────────────────┘
        │                         │
   ┌────▼────┐              ┌─────▼────┐
   │Postgres │              │  FAISS   │
   │(Primary)│              │(Vectors) │
   └─────────┘              └──────────┘
```

---

## ✨ Core Features

| Feature | Description | Status |
|---|---|---|
| 🤖 **AI Consultant Engine** | CBT-style empathetic responses via Gemini | 🔄 In Progress |
| 📚 **RAG Knowledge Base** | Psychology books → FAISS vector search | ✅ Phase 1 Active |
| 🛡️ **Safety Detection** | Crisis/self-harm trigger detection + emergency escalation | 🔜 Planned |
| 😔 **Emotion Detection** | Real-time emotional state classification | 🔜 Planned |
| 💬 **Chat System** | Full async chat with memory | 🔜 Planned |
| 🧠 **Memory System** | Long-term user context & summarization | 🔜 Planned |
| 🎙️ **Voice Calls** | Realtime voice consultation | 🔜 Planned |
| 📹 **Video Calls** | WebRTC-powered video sessions | 🔜 Planned |
| 📅 **Appointment Booking** | Schedule sessions with human therapists | 🔜 Planned |

---

## 📚 Psychology Knowledge Base

InnerTone's RAG pipeline is powered by **11 curated psychology & wellness books**:

- 📗 *Cognitive Behavioral Therapy: Basics and Beyond* — Judith Beck
- 📘 *Feeling Good* — David D. Burns
- 📙 *The Anxiety and Phobia Workbook* — Edmund Bourne
- 📕 *Dare: The New Way to End Anxiety* — Barry McDonagh
- 📗 *Emotional Intelligence* — Daniel Goleman
- 📘 *Self-Compassion: The Proven Power* — Kristin Neff
- 📙 *The Happiness Trap* — Russ Harris
- 📕 *Why Zebras Don't Get Ulcers* — Robert M. Sapolsky
- 📗 *Burnout: The Secret to Unlocking the Stress Cycle* — Emily & Amelia Nagoski
- 📘 *The Relaxation and Stress Reduction Workbook*
- 📙 *Atomic Habits* — James Clear

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI (Python 3.10+, Async) |
| **LLM** | Google Gemini API |
| **Embeddings** | Google Gemini Embedding (`gemini-embedding-001`) |
| **Vector Store** | FAISS (local, high-performance) |
| **Primary DB** | PostgreSQL (via SQLAlchemy + asyncpg) |
| **ORM** | SQLAlchemy 2.0 (async) |
| **PDF Processing** | LangChain + PyPDF |
| **Text Splitting** | Recursive Character Text Splitter (2000 chars, 200 overlap) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Google Gemini API Key → [Get one free](https://ai.google.dev)

### 1. Clone the repository

```bash
git clone https://github.com/Shreyxpatil/InnerTone.git
cd InnerTone
```

### 2. Set up virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
DATABASE_URL="postgresql+asyncpg://<user>:<password>@localhost:5432/<dbname>"
GEMINI_API_KEY="your-google-gemini-api-key"
```

### 4. Set up PostgreSQL

```sql
CREATE DATABASE innertone;
CREATE USER innertone_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE innertone TO innertone_user;
GRANT ALL ON SCHEMA public TO innertone_user;
```

### 5. Initialize database tables

```bash
PYTHONPATH=. python init_db.py
```

### 6. Ingest your psychology books

Place all PDF books in the `Books/` folder, then run:

```bash
PYTHONPATH=. python innertone/rag/ingest.py
```

> ⚠️ **Note**: The free Gemini tier has rate limits. Ingestion uses batching + delays automatically to stay within quota.

---

## 🧭 Development Roadmap

We are building InnerTone in **10 structured phases**:

```
Phase 1  ✅  RAG pipeline (PDF → Chunks → FAISS)
Phase 2  🔄  LLM Consultant Engine (Gemini + CBT prompts)
Phase 3  🔜  Emotion Detection 
Phase 4  🔜  Safety Detection System
Phase 5  🔜  Chat System (async WebSocket)
Phase 6  🔜  Memory System (long-term context)
Phase 7  🔜  Voice Call Support
Phase 8  🔜  Video Call Support (WebRTC)
Phase 9  🔜  Appointment Booking System
Phase 10 🔜  Full Deployment (Docker, CI/CD)
```

---

## 🔐 Safety by Design

InnerTone has a built-in **safety-first architecture**:

- 🚨 Crisis detection runs **before** the LLM processes any message
- 🔴 High-risk conversations are flagged and emergency resources are surfaced
- 🚫 The AI will **never** diagnose medical conditions or suggest medication
- All responses follow **CBT-style reasoning** with empathy at the core

---

## 🤝 AI Response Philosophy

Every response from InnerTone follows this structure:

1. **Acknowledge** the emotion the user expressed
2. **Logical reflection** using CBT principles
3. **Coping suggestion** — small, actionable step
4. **Follow-up question** to deepen understanding

---

## 📁 Project Structure

```
InnerTone/
├── Books/                    # PDF knowledge base (11 psychology books)
├── innertone/
│   ├── core/
│   │   ├── config.py         # Pydantic settings
│   │   └── database.py       # Async SQLAlchemy engine
│   ├── models/
│   │   └── document_metadata.py  # ORM for chunk metadata
│   ├── rag/
│   │   └── ingest.py         # PDF → Chunks → Embeddings → FAISS
│   ├── services/             # (Upcoming) Consultant, Safety, Emotion
│   └── api/                  # (Upcoming) FastAPI routers
├── init_db.py                # Database initialization script
└── .env                      # Environment config
```

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 👤 Author

**Shreya Patil**
Building AI systems for mental health & human wellbeing.

[![GitHub](https://img.shields.io/badge/GitHub-Shreyxpatil-black.svg?logo=github)](https://github.com/Shreyxpatil/InnerTone)

---

<div align="center">

*Built with ❤️ for mental wellness*

**⭐ Star this repo if you believe in the mission!**

</div>
