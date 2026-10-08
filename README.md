# Glowworm

A clone of the Fireflies.ai meeting assistant, built as an SDE Fullstack take-home: a library of past meetings, an interactive transcript synced with a (simulated) media player, AI-style notes (overview, keywords, chapters, action items), and full create / edit / delete.

**Stack:** Next.js (App Router), TypeScript and Tailwind CSS on Vercel · FastAPI, SQLAlchemy 2.0 and Pydantic v2 on Render · SQLite with FTS5 full-text search.

**Live:** [glowworm-plum.vercel.app](https://glowworm-plum.vercel.app) (app) · [glowworm-api.onrender.com/docs](https://glowworm-api.onrender.com/docs) (interactive API docs). The API runs on Render's free tier and sleeps when idle, so the first request after a while can take up to a minute.

> Work in progress. Setup and deploy steps, the schema diagram, the API overview and the list of completed bonus features are added as the project progresses.
> Design and decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
