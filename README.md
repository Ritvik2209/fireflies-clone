# Glowworm

[![CI](https://github.com/Ritvik2209/fireflies-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/Ritvik2209/fireflies-clone/actions/workflows/ci.yml)

A clone of the Fireflies.ai meeting assistant, built as an SDE Fullstack take-home. It has:
- a library of past meetings;
- a transcript synced with a simulated media player;
- AI-style notes: overview, keywords, chapters and action items;
- full create, edit and delete.

**Live app:** [glowworm-plum.vercel.app](https://glowworm-plum.vercel.app)
**API docs:** [glowworm-api.onrender.com/docs](https://glowworm-api.onrender.com/docs) (Swagger UI)

> The API runs on Render's free tier, which sleeps when idle. The first request after a quiet spell can take up to a minute; the app shows a "waking up the server" note while it waits.

Design notes, the database schema with an ER diagram, the full API reference and the data flows are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Features

**Meetings library** (`/meetings`)
- Meetings grouped by day. Each shows its title, date, time, duration and participant avatars.
- Search by title (in the top bar), filter by participant and date range, sort newest or oldest first.
- Filters live in the URL, so a filtered view survives a reload and can be shared.
- Loading skeletons, empty and no-results states, and a clear error with "Try again".

**Meeting page** (`/meetings/{id}`)
- The transcript, with speaker avatars, names and clickable timestamps.
- A simulated player: play/pause, seek bar, current and total time, speed (1× / 1.5× / 2× / 0.5×), skip ±15 s. There is no audio; it's an accurate clock.
- Two-way sync:
  - Clicking a line, a chapter or an action item's timestamp seeks.
  - While playing, the current line is highlighted and scrolled into view.
  - Scrolling the transcript yourself pauses auto-scroll until you press "Sync with player".
- Transcript search: highlights every match, shows "n of m", previous/next (also Enter / Shift+Enter).
- AI notes: keywords, overview, chapters with time ranges (click to seek), and action items grouped by assignee.
- **Speaker talk time:** one bar per speaker in their avatar colour, with talk time, words per minute, questions asked and longest monologue, computed from the transcript.

**Create, edit, delete**
- **New meeting:** a title, a date and time, and participants. The transcript is uploaded as a `.txt`, `.vtt` or `.json` file (picked or dragged in), or pasted. The meeting appears in the library straight away as **Processing**: the backend parses the transcript and writes the notes in the background. A toast says when it's ready, or the row turns **Failed** with the reason and a Delete button.
- **Edit** a meeting's title and participants. **Delete** asks for confirmation first.
- **Action items:** add, edit text and assignee, mark complete, delete.
- Every change is saved in SQLite and confirmed with a toast; failures show the server's error message.

**Intro tour:** an optional two-minute walkthrough. It's offered on a first visit, and the compass button in the top bar restarts it. Each step dims the page except one feature and says what it does; at one step you open a seeded meeting yourself.

**Works on phones and tablets:** below 1024 px the sidebar becomes a menu, and the meeting page switches between Notes and Transcript with tabs. No page scrolls sideways, even at phone width.

**Fireflies-style shell:** sidebar navigation, a top bar with search, New meeting, settings and profile, and "Coming soon" pages for Record, Integrations, Team and Settings.

**Bonus features (all six built):**
- **Dark mode:** a top-bar toggle that follows the system setting until you pick a theme, and remembers your choice.
- **Tags:** coloured tags on meetings, managed in the Edit dialog; filter the library by tag.
- **Export:** the transcript or the summary as TXT, Markdown or PDF.
- **Global search:** full-text search over every transcript (SQLite FTS5) with highlighted snippets; a result opens the meeting at that moment.
- **Highlights, comments and soundbites:** colour a transcript line, discuss it in a comment thread, or save a titled clip that plays only its range.
- **"Ask about this meeting":** a chat that answers from the transcript (Groq, `openai/gpt-oss-120b`) and cites clickable timestamps. Without an API key it answers from search instead.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, lucide-react, sonner (toasts), next-themes |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (sync), Pydantic v2 |
| Database | SQLite (own schema) with FTS5 full-text search |
| AI chat | Groq (`openai/gpt-oss-120b`) through the official `openai` SDK, called from the backend only |
| Hosting | Vercel (frontend) · Render (backend, `render.yaml` Blueprint) |
| Quality | pytest, ruff, ESLint, Prettier; GitHub Actions CI on every push and pull request |

## Run it locally

You need Python 3.12 and Node.js 20 or newer.

**Backend** (in `backend/`). It serves http://localhost:8000, with docs at `/docs`:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

On first start it creates `app.db` and seeds six sample meetings. Delete `app.db` to start fresh.

**Frontend** (in `frontend/`). It serves http://localhost:3000:

```bash
npm install
npm run dev                        # use `npm run dev -- -p 3001` if port 3000 is taken
```

The frontend calls `http://localhost:8000` by default, and the backend's default CORS settings allow ports 3000 and 3001. No `.env` file is needed.

### Environment variables

| Variable | Where | Default |
|---|---|---|
| `DATABASE_URL` | backend | `sqlite:///./app.db` |
| `CORS_ORIGINS` | backend, comma-separated | `http://localhost:3000,http://localhost:3001` |
| `LLM_PROVIDER`, `LLM_MODEL` | backend (chat) | `groq`, `openai/gpt-oss-120b` |
| `LLM_API_KEY` | backend only, never the frontend (chat) | unset: the chat answers from search |
| `NEXT_PUBLIC_API_URL` | frontend, baked in at build time | `http://localhost:8000` |

## Transcript formats

Sample files for each format are in [`backend/samples/`](backend/samples/).

| Format | Shape |
|---|---|
| `.txt` | One utterance per line: `[HH:MM:SS] Speaker Name: text` (or `[MM:SS]`). Without timestamps (`Speaker Name: text`), times are estimated at about 150 words per minute. |
| `.vtt` | Standard WebVTT cues. The speaker comes from `<v Name>` or a `Name:` prefix. |
| `.json` | `[{"speaker": "...", "start": 12.5, "end": 18.0, "text": "..."}]`, with times in seconds. |

Everyone who speaks becomes a participant. A missing title, an unknown format or an empty transcript is rejected at once (HTTP 422). A file that can't be parsed becomes a **Failed** meeting whose message names the line or item number.

## How the notes are generated

The six seeded meetings have hand-written notes. New meetings get notes from a rule-based summariser (`backend/app/services/summary_generator.py`, no LLM):
- **Overview:** the first few substantial sentences.
- **Keywords:** the most frequent meaningful words, leaving out stopwords and speakers' names.
- **Chapters:** about 5-minute windows, each titled by its top terms.
- **Action items:** sentences where someone commits to something ("I'll…", "we will…", "need to", "let's", "follow up", "by Friday"…). Questions and pleasantries are skipped, and the assignee is the speaker.

## API

Every route is under `/api`. The interactive docs at [`/docs`](https://glowworm-api.onrender.com/docs) show each request and response model, and the full reference is in [ARCHITECTURE.md §7](docs/ARCHITECTURE.md#7-api). Errors are always `{"detail": "..."}`; validation errors also list each field.

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Meetings | `GET, POST /meetings` (list filters: `q`, `participant_id`, `tag_id`, `date_from`, `date_to`, `sort`) · `GET, PATCH, DELETE /meetings/{id}`. `POST` answers 202: the transcript is processed in the background. |
| Action items | `POST /meetings/{id}/action-items` · `PATCH, DELETE /action-items/{id}` |
| People and tags | `GET /participants` · `GET, POST /tags` · `DELETE /tags/{id}` |
| Export | `GET /meetings/{id}/export?content=transcript\|summary&format=txt\|md\|pdf` |
| Search | `GET /search?q=`: full-text search over every transcript |
| Highlights, comments, soundbites | `PUT, DELETE /segments/{id}/highlight` · `GET, POST /segments/{id}/comments` · `PATCH, DELETE /comments/{id}` · `GET, POST /meetings/{id}/soundbites` · `PATCH, DELETE /soundbites/{id}` |
| Chat | `GET, POST, DELETE /meetings/{id}/chat` |
| Speaker analytics | `GET /meetings/{id}/analytics` |

## Database

SQLite with foreign keys enforced; SQLAlchemy creates the tables at startup. The ER diagram and every constraint are in [ARCHITECTURE.md §6](docs/ARCHITECTURE.md#6-database).

| Table | Holds |
|---|---|
| `users` | The default user (there's no real login). |
| `meetings` | Title, date, duration, source, and `status` (`processing`, `ready` or `failed`) with `error_message` (Extra 3). |
| `participants`, `meeting_participants` | People, shared across meetings. |
| `transcript_segments` | The transcript lines: speaker, start and end in ms, text. `segments_fts` indexes them for search. |
| `summaries`, `chapters`, `action_items` | The AI notes. |
| `tags`, `meeting_tags` | Tags (bonus 2). |
| `highlights`, `segment_comments`, `soundbites` | Annotations (bonus 5). |
| `chat_messages` | The "Ask about this meeting" history (bonus 6). |

## Tests and checks

```bash
cd backend && pytest && ruff check . && ruff format --check .            # 81 tests: parsers, generator, every API area
cd frontend && npm run lint && npx prettier --check . && npm run build   # build also type-checks
```

**Continuous integration:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request to `main`, as two parallel GitHub Actions jobs:
- **Backend:** Python 3.12.7, the same as Render: `ruff check`, `ruff format --check`, `pytest`.
- **Frontend:** Node 22, from `engines` in `package.json`, which Vercel also uses: `npm ci`, `npm run lint`, `npm run format:check`, `npx next typegen`, `npx tsc --noEmit`, `npm run build`.

No secrets are needed: the chat tests replace the LLM with a fake. The badge at the top shows the latest result.

## Deployment

- **Backend (Render):**
  - `render.yaml` is a Blueprint for one free web service, with root `backend/`.
  - It's built with `pip install -r requirements.txt` and started with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; the health check is `/api/health`.
  - `CORS_ORIGINS` is set there to the Vercel address.
  - To deploy your own: Render dashboard → New → Blueprint → pick the repository.
- **Frontend (Vercel):** import the repository with root directory `frontend/`, and set `NEXT_PUBLIC_API_URL` to the Render URL.
- **Updates:** both redeploy automatically on every push to `main`. CI runs alongside the deploys and doesn't block them yet (see ARCHITECTURE.md §10.1).

## Assumptions and trade-offs

- **No real login.** Everything runs as one default user, Alex Morgan. Every query is scoped to the owner, so real auth would plug in at a single dependency (`get_current_user`).
- **The player is simulated.** There's no audio or speech-to-text; transcripts are uploaded or pasted, as the brief allows.
- **SQLite on Render's free tier is temporary.** The disk is wiped on every restart or redeploy, so the database re-seeds the six sample meetings, and meetings you create don't survive a restart. Production would use a persistent database such as Postgres, with migrations.
- **Dates are stored in UTC** and shown in your browser's time zone.
- **Library search matches titles only**, and there's no pagination; both are fine at this scale. Searching inside transcripts is the global-search bonus.
- **Uploads are processed in the background inside the API process** (FastAPI `BackgroundTasks`). A restart mid-job loses the job (startup marks such meetings failed), and it can't scale across machines. Production would use a job queue (Celery or RQ with Redis) with retries, and push status updates instead of polling.
- **People are identified by name,** matched case-insensitively. People who speak in a transcript always stay participants of that meeting.

## Project structure

```text
backend/app/      FastAPI app: routers (HTTP) → services (rules) → models (SQLAlchemy); parsers, seed data
backend/tests/    pytest suite
backend/samples/  example transcripts in every supported format
frontend/src/     Next.js app: app/ (routes), components/, hooks/ (player clock), lib/ (API client, helpers)
docs/             ARCHITECTURE.md: design, schema, API and data flows
render.yaml       Render Blueprint for the backend
.github/         CI workflow (GitHub Actions)
```
