# CLAUDE.md

**Glowworm**, a Fireflies.ai clone (SDE Fullstack take-home). This file is the condensed brief; follow it in every session.
Full design, schema, API and data flows: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Ground rules

- **Deadline:** Friday 9 October 2026, 18:00 IST (target ~16:00). **Hard cut-off for bonus work: Friday 15:00 IST.**
- **The owner must explain every line in an interview.** Clarity beats cleverness: explicit, simple, documented code. Short comments only where the *why* isn't obvious.
- **Scope is locked** (below). Don't add features, libraries, dependencies or pages without asking first.
- **If the brief is ambiguous or conflicts, ask instead of guessing.**
- **Plagiarism = disqualification.** Original code only; never reproduce an existing Fireflies-clone repo.
- **Core first.** No bonus work until the Core Gate (below) passes on the live app and the owner confirms.
- **End of every phase:** stop and report
  1. the commits made, and the files created/changed, each with a one-line purpose;
  2. how to run and test what was built;
  3. 3–5 things the owner should understand (concepts, decisions, trade-offs);
  4. time left until the Friday 15:00 IST cut-off.

  Then wait for "go".
- Keep `docs/ARCHITECTURE.md` in step with the code; each bonus phase adds its own data flow. `INTERVIEW_PREP.md` holds the owner's private notes (git-ignored); regenerate it from the final code in Phase 13. `INTERVIEW_HIGHLIGHTS.md` (also git-ignored) collects the talking points found while building; add the new ones at the end of every phase.

## Git and GitHub (Claude does all of it)

- Public repo: https://github.com/Ritvik2209/fireflies-clone. Work on `main` only; commit straight to it.
- **Live:** frontend https://glowworm-plum.vercel.app (Vercel project `glowworm`, root `frontend/`) · backend https://glowworm-api.onrender.com (Render Blueprint service `glowworm-api`). **Both redeploy automatically on every push to `main`**; Render also re-applies `render.yaml`, so change Render settings there, not in the dashboard.
- The commit identity (the owner's name and email) is set in this repo's local git config. Never change it; never pass `--author`.
- **Commit small and often:** one commit per small working piece (typically every 15–45 minutes of work), never a whole phase in one commit.
- **Every commit leaves the project working:** run the relevant lint and tests first. Never commit secrets, `.env` files or `*.db` files.
- **Push after every commit:** `git push origin main`.
- **Conventional Commits**, imperative mood, saying what and why, e.g. `feat(backend): add VTT transcript parser with speaker extraction`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`.
- Keep the `Co-Authored-By: Claude …` trailer at the end of commit messages (the owner chose to keep it).
- If a push fails (authentication, rejected, conflict), stop and tell the owner. Never force-push; never rewrite pushed history.

## Stack (fixed)

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript (strict) + Tailwind CSS |
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2.0 (sync) + Pydantic v2 |
| Database | SQLite (own schema) + SQLite FTS5 for global search |
| LLM (bonus 6 only) | Called from the backend only; the owner picks the provider (Anthropic or OpenAI) at Phase 12; key in an env var |
| Hosting | Vercel (frontend, root `frontend/`) · Render (backend, root `backend/`) |

**Approved extra dependencies only:** `lucide-react`, `sonner`, `next-themes`, `uvicorn`, `pytest`, `httpx`, `ruff`, ESLint, Prettier, `fpdf2` (PDF export), and one official LLM SDK (`anthropic` or `openai`, the owner's choice).
No data-fetching library, no UI kit, no ORM other than SQLAlchemy. Ask before adding anything else. Consequences:
- `config.py` reads `os.environ` directly (no `pydantic-settings`, no `python-dotenv`).
- Uploads arrive as JSON text, so no `python-multipart`; install plain `fastapi`, not `fastapi[standard]`.
- No `EmailStr` (it needs `email-validator`).
- Stopwords are a hand-written list (no NLTK/spaCy); chat rate limiting is our own code (no rate-limit library).

## Locked scope

### Core (must have)
- **A. Library `/meetings`:** rows show title, date, duration, participant avatars (initials). Search by title; filter by participant and date range; sort newest/oldest. Fireflies layout: left sidebar + top bar (search, "Upload / New meeting" button, profile and settings placeholders).
- **B. Meeting page `/meetings/[id]`:** transcript with speaker labels and timestamps. **Simulated player** (virtual clock on `requestAnimationFrame`, no audio): play/pause, seek bar, current/total time, playback speed. Click a line → seek. Play/seek → active line highlights and auto-scrolls (binary search over segment `start_ms`). Transcript search: `<mark>` every match, "n of m", next/previous.
- **C. AI notes:** overview, keywords, action items, chapters (click → seek). Seeded meetings have hand-written notes. New meetings use the **rule-based generator** (no LLM): overview = first few substantial sentences; action items = segments matching "will / need to / let's / follow up / action item / by Friday…", assignee = speaker; chapters = ~5-minute windows titled by their most frequent non-stopword terms; keywords = top ~6 non-stopword terms. Store `generated_by = "seed" | "rule_based"`.
- **D. CRUD (persisted in SQLite):** create via modal (title, date, participants, plus transcript by file upload `.txt/.vtt/.json` *or* pasted text; the browser reads the file and sends text + format, the backend parses). Edit title and participants. Delete with a confirmation modal (cascades). Action items: add, edit text/assignee, mark complete, delete.
- **E. Fireflies experience:** sidebar navigation, modals, forms, filters; toasts for every create/update/delete and every error; "Coming soon" placeholder pages styled like Fireflies (Integrations, Record / live bot, Team, Settings); a default logged-in user (no real auth); loading skeletons; empty states.

### Bonus: all six, only after the Core Gate, in this order
1. **Dark mode** (Phase 7): `next-themes`, toggle in the top bar, `dark:` classes on every component, preference remembered.
2. **Tags + filtering** (Phase 8): many-to-many, coloured chips on library rows and the meeting page, create/assign/remove tags in the edit modal, filter the library by tag.
3. **Export** (Phase 9): transcript or summary as TXT, Markdown or PDF from an export menu on the meeting page; backend endpoint (`fpdf2` for PDF) with a proper `Content-Disposition` filename.
4. **Global search** (Phase 10): FTS5 over transcript text. The top-bar search opens a results page with meeting title, speaker, timestamp and a highlighted snippet; a result opens `/meetings/{id}?t=<ms>` and the player seeks on load.
5. **Comments, highlights, soundbites** (Phase 11): highlight a line in a colour (shown in the transcript and in a "Highlights" list; click to seek); comments on a line (add/edit/delete, comment icon with count, thread popover); soundbites = titled time ranges (from a line, or start/end from the player) that play **only** that range.
6. **"Ask about this meeting" chat** (Phase 12): a chat tab. The backend prompt holds the summary plus `[mm:ss] Speaker:` transcript lines; the model answers only from the transcript and cites timestamps (rendered as seek links). Too-long transcripts → only the most relevant segments, found via FTS5. **No API key → "Relevant moments" fallback from FTS5**, so the demo never breaks. History stored per meeting; key only in a backend env var; limit question length and messages per minute.

### Out of scope (placeholders only)
Real auth (default user), integrations (Zoom/Meet/calendar/CRM), live meeting bot, real speech-to-text, team sharing. The player is simulated.

## ⛔ Core Gate (end of Phase 6)

Verify every item **on the deployed app**, report the results, and wait for the owner's "go" before any bonus:

- [ ] Library lists all seeded meetings with title, date, duration, participants
- [ ] Search by title, filter by participant and date range, and sort by recency all work
- [ ] Meeting page shows the transcript with speaker labels and timestamps
- [ ] Player plays, pauses, seeks; seek bar and time display update
- [ ] Clicking a transcript line seeks the player; playing/seeking highlights and scrolls to the active line
- [ ] Transcript search highlights all matches with next/previous navigation
- [ ] Summary overview, keywords, chapters (click to seek) and action items display
- [ ] Create a meeting by uploading .txt, .vtt and .json files and by pasting text; summary is generated
- [ ] Edit title and participants; delete a meeting (with confirmation); data persists after refresh
- [ ] Add, edit, complete and delete action items; persists after refresh
- [ ] Toasts on every create/update/delete and on errors
- [ ] Placeholder pages exist and look like Fireflies; navbar has profile/settings placeholders
- [ ] Backend tests pass; frontend and backend lint clean
- [ ] Every core item has been committed and pushed

## Structure and rules

```text
render.yaml        Render Blueprint for the backend (Phase 1); plus Vercel config if needed
backend/app/
  main.py          app, CORS, routers under /api, error handlers, startup (create tables, seed if empty)
  config.py        settings from env vars
  database.py      engine, SessionLocal, Base, get_db, FK pragma (+ FTS5 setup SQL from bonus 4)
  dependencies.py  get_current_user(): the default user; the only place real auth would plug in
  errors.py        domain exceptions + handlers that turn them into JSON errors
  models/          SQLAlchemy models, one file per table group
  schemas/         Pydantic request/response models
  routers/         HTTP only: validate → call a service → return
  services/        business logic: meetings, participants, action_items, summary_generator
                   (+ tags, export, search, annotations, chat in their bonus phases)
  llm/             LLM client wrapper + prompt building (bonus 6), isolated so the provider is swappable
  parsers/         txt / vtt / json parsers + dispatcher → list[ParsedSegment]
  seed/            seed_data.json + seed.py
backend/samples/   demo upload files in all three formats
backend/tests/     pytest: parsers, summary generator, key endpoints
backend/requirements.txt / requirements-dev.txt   runtime deps (installed on Render) / + pytest, httpx, ruff
backend/pyproject.toml                            ruff + pytest config
frontend/src/
  app/             routes: /meetings, /meetings/[id], /search, /settings, /integrations, /team, /record
  components/      layout/, meetings/, meeting-detail/, ui/ (see ARCHITECTURE.md §3)
  hooks/           usePlayer, useDebounce
  lib/             api.ts (typed fetch client), types.ts, format.ts, url.ts, transcript.ts (pure helpers)
```

- Routers never contain business logic. Services never raise `HTTPException`; they raise domain errors from `errors.py`.
- Components never call `fetch` directly; always go through `lib/api.ts`. Shared types live in `lib/types.ts`.
- No file over ~250 lines without a reason.
- Type hints on all Python. Strict TypeScript, no `any`.
- Lint/format: `ruff` (backend), ESLint + Prettier (frontend).

## Design decisions (keep consistent; append new ones)

- **Time:** times inside a meeting are integer **milliseconds** from its start. Datetimes are stored in UTC, and the API always serialises them with a UTC offset (`Z`) so browsers convert them to local time correctly. The frontend sends UTC ISO strings.
- **Default user:** Alex Morgan `<alex.morgan@example.com>`, avatar colour `indigo` (shown by `frontend/src/lib/currentUser.ts`; the backend seed must match). `get_current_user()` returns it; every service query is scoped by `owner_id`. Another user's meeting → 404. Annotations and chat messages record their author in `user_id`.
- **Next.js 16.4** (Turbopack; Tailwind v4 through its Turbopack loader). Cache Components is **off** (all data is fetched client-side). Next's own `frontend/AGENTS.md` says APIs changed since training data: read `frontend/node_modules/next/dist/docs/` before using a Next API you're unsure of.
- **Layers:** routers → services (business rules, `db.commit()`) → models. Parsers and the summary generator are pure functions with no DB access. `llm/` knows the SDK but not the database.
- **Errors:** JSON `{"detail": "<message>"}` everywhere (validation errors add an `errors` list). Codes: 200; 201 (POST returns the created resource); 204 (DELETE); 404; 409 (duplicate tag name, or removing a participant who speaks in the meeting's transcript); 422 (invalid input, unparseable transcript); 429 (chat rate limit).
- **SQLite:** `PRAGMA foreign_keys=ON` via an engine `connect` event; `check_same_thread=False`; `Base.metadata.create_all()` at startup (no Alembic, a documented trade-off); seed when the DB is empty.
- **ORM:** SQLAlchemy 2.0 typed style (`Mapped`, `mapped_column`); `relationship(back_populates=...)` on both sides; parent collections use `cascade="all, delete-orphan"` **and** FKs use `ondelete="CASCADE"`; many-to-many via `secondary=`; `Meeting.summary` uses `uselist=False`; segments and chapters `order_by=position`; `selectinload` for collections (list and detail). Segment-level children (highlights, comments) also get `passive_deletes=True`, so deleting a meeting doesn't lazy-load every segment's annotations; the DB cascade removes them.
- **Indexes (decided):** no index on `meetings.title` (a `LIKE '%q%'` search can't use a B-tree index) and no `(meeting_id, start_ms)` index on segments (seeking happens in the browser; transcripts load via `UNIQUE (meeting_id, position)`). Both are documented in ARCHITECTURE.md §6.5.
- **Participants by name:** create/edit forms send names; names and transcript speakers are matched case-insensitively (`participants.name` is `COLLATE NOCASE`, so the index is still used) or created. Speakers always remain participants of their meeting: a PATCH that removes one → 409. Segments carry only `speaker_id`; the client looks up the name in `meeting.participants`. Parsed segments are stable-sorted by `start_ms` before positions are assigned (binary search depends on it).
- **Colours** (`participants.avatar_color`, `tags.color`) are palette keys such as `"violet"`, mapped to complete static Tailwind classes in the frontend. Never build class names dynamically (`bg-${c}-500` is invisible to Tailwind).
- **Frontend data:** client components fetch through `lib/api.ts` (browser → API directly, hence CORS and `NEXT_PUBLIC_API_URL`). Skeletons cover Render cold starts; an `AbortController` drops stale responses. Library filters live in the URL query string.
- **Player:** `usePlayer` computes `currentMs = anchorMs + (performance.now() − anchorTime) × rate` in a rAF loop (no drift); a seek or speed change sets a new anchor. `findActiveIndex` (`lib/transcript.ts`, a plain function, not a hook) binary-searches for the last segment with `start_ms ≤ currentMs`. `TranscriptLine` is `React.memo`, so only lines whose active state changes re-render. Soundbites (bonus 5) use `playRange(start, end)`, which pauses automatically at `end`.
- **XSS-safe rendering:** search matches, FTS snippets and chat citations are rendered by splitting text into strings and React elements (`<mark>`, seek buttons). Never use `dangerouslySetInnerHTML`. FTS `snippet()` marks matches with `\x02` / `\x03`.
- **FTS queries (bonus 4):** split user input into words and double-quote each before `MATCH` (raw input such as `don't` is an FTS5 syntax error); always a bound parameter. Tokenizer `porter unicode61`. Rank with `bm25()` (lower = better). Chat retrieval (bonus 6) drops stopwords and joins the quoted terms with `OR`.
- **Uploads:** the browser reads the file (`file.text()`), takes the format from the extension, enforces a size cap, and POSTs JSON `{transcript_text, format, source}`.
- **LLM chat (bonus 6):** `llm/` wraps the SDK behind one function and builds the prompt; the transcript is delimited and treated as data, not instructions. The key never leaves the backend. No key, or an LLM error/timeout → the FTS "Relevant moments" answer (`answered_by = "fallback"`). Question length cap → 422; per-meeting messages-per-minute limit, counted from `chat_messages` → 429.
- **Phase 2 implementation choices** (details in ARCHITECTURE.md §4.5–4.8 and §6.7):
  - SQLAlchemy **2.1.4** with the 2.0-style typed API.
  - Every datetime column uses `UTCDateTime` (`models/types.py`): naive UTC stored, aware UTC read back, naive input rejected.
  - Allowed values are `Literal` types next to their table (`AvatarColor`, `GeneratedBy`), and they generate the CHECK constraints.
  - `services/meetings.save_meeting()` is the **single write path** for the create endpoint and the seed script. It takes a storage-independent `MeetingNotes` (from `generate_notes` or from seed JSON), sorts segments, and makes every speaker, named participant and assignee a participant. Callers commit once, then re-read with `get_meeting`.
  - Removing a participant from a meeting unassigns their action items in it. Assignees must be participants of the meeting (422).
  - PATCH bodies reject explicit `null` for non-nullable fields (422 "x: can't be null"). The list filters are a Pydantic query model, with timezone-aware dates and an inverted range → 422. Title search escapes `%`/`_`.
  - Parsers: the first `.txt` line decides timestamped or untimestamped mode; continuation lines join the previous utterance. The generator excludes speakers' names from keywords, needs a person for "will" ("I'll", "we will"), and skips questions and pleasantries.
  - Tests set `DATABASE_URL` to a temp file in `conftest.py` before importing the app, and don't run the lifespan.
- **Phase 3 implementation choices** (details in ARCHITECTURE.md §5.1, §5.2 and §8.1):
  - **Search box:** the top-bar search is the library's title search, like Fireflies' "Search by title".
    - On `/meetings` it writes `?q=` on every keystroke; on other pages, Enter opens `/meetings?q=…`.
    - It shows the typed draft while focused and the URL's `q` otherwise.
  - **Query string:**
    - It is updated with `window.history.replaceState` (`lib/url.ts`), not `router.replace`. Next.js keeps `useSearchParams` in sync without a navigation or a server round trip.
    - URL keys: `q`, `participant`, `from`/`to` (local `YYYY-MM-DD`), and `sort=oldest` (the default, recent, isn't written).
  - **Filters:**
    - Participant, dates and sort are local state, initialised from the URL once and mirrored back.
    - `q` is read from the URL on every render and debounced 300 ms before fetching.
  - **Loading:**
    - It is derived (`loaded.key !== requestKey`), not stored.
    - The previous request is aborted on change, and "Try again" bumps an attempt counter.
    - After 4 s, a hint explains Render's cold start.
  - **Rows:**
    - Meetings are grouped by local day.
    - A row shows the owner's avatar (as Fireflies does), the title, date · time · duration, and an `AvatarStack` of participants.
  - **Removed:** the Phase 1 `ApiStatus` badge and `getHealth`, because the library's loading and error states now show whether the API is reachable.
- **Phase 4 implementation choices** (details in ARCHITECTURE.md §3, §5.3 and §8.2–8.5):
  - **Components:**
    - `MeetingView` loads the meeting and shows the skeleton, "Meeting not found" (404, or an id that isn't a number) or an error with Try again.
    - `MeetingWorkspace` (keyed by meeting id) owns the player and the layout: notes on the left (~55%), transcript on the right, player bar at the bottom.
  - **State:**
    - Transcript search state lives in `TranscriptPanel`, the only component that uses it.
    - `findActiveIndex` is a pure function in `lib/transcript.ts`, not a `useActiveSegment` hook. It also finds the active chapter.
  - **Follow mode:**
    - Wheel or touch scrolling in the transcript stops auto-scroll and shows "Sync with player" (Fireflies' "Sync with audio").
    - The button, or any seek, resumes it. Auto-scroll also pauses while searching.
  - **Scrolling:**
    - The transcript scrolls only its own container (`container.scrollTo`), never `scrollIntoView`, which scrolls every ancestor.
    - Every scroll area is `relative` (see Known gotchas).
  - **Memoisation:** `SummaryPanel`, `TranscriptPanel` and `TranscriptLine` are memoised with stable callbacks, so a normal frame re-renders only the workspace and the player bar.
  - **Controls:**
    - The seek bar is a native range input (1 s steps).
    - Speed cycles 1× → 1.5× → 2× → 0.5×, and skip is ±15 s.
    - Clicking a line seeks unless text is being selected; its timestamp is a button for keyboard users.
  - **Notes:**
    - Action items are grouped by assignee and read-only until Phase 5. Their timestamp seeks.
    - The notes show whether they're hand-written seed notes or generated from the transcript.
  - **Not yet:** `?t=` deep links arrive with global search (bonus 4).
- **Phase 7 (dark mode) implementation choices** (details in ARCHITECTURE.md §9.1):
  - **Palette swap:** under `.dark` the neutral colour tokens get dark values (`@layer base` in `globals.css`), instead of a `dark:` class on every element.
    - The grey scale is mirrored, so each step keeps its role.
    - `bg-white` became the `surface` token; `link`, `active-line`, `brand-50` and `brand-100` get dark values.
    - Only purple text (`dark:text-brand-300`) and icon tiles use `dark:` classes; search marks use `text-black`.
  - **`ThemeToggle`** (top bar) switches light/dark. Its icon is chosen by CSS, so there's no hydration mismatch and no "mounted" flag.
  - **`next-themes`:** default `system`; the choice is remembered in `localStorage`; it sets `color-scheme`, so native controls go dark; transitions are disabled while switching.
- **Seed world:** a fictional field-service software company, Kestrel (people and emails in `seed_data.json`; the default user Alex Morgan is Head of Product). Seed dialogue is hand-written; times were computed from word counts (95–100 wpm plus pauses) so meetings run 15–17 min. Bonus phases add their seed data to the same file.

## Schema summary (full spec and ER diagram: ARCHITECTURE.md §6)

- **Core tables (Phase 2):** `users` 1─N `meetings` · `meetings` N─M `participants` via `meeting_participants` · `meetings` 1─N `transcript_segments` (ordered by `position`; `speaker_id` → participants) · `meetings` 1─1 `summaries` (UNIQUE `meeting_id`; `keywords` is a JSON list on purpose, because it is display-only) · `meetings` 1─N `chapters` (ordered) · `meetings` 1─N `action_items` (`assignee_id` → participants, nullable).
- **Bonus tables, each created in its own phase:** `tags` + `meeting_tags` (Phase 8) · `segments_fts`, an external-content FTS5 table over `transcript_segments.text` kept in sync by AFTER INSERT/UPDATE/DELETE triggers (Phase 10) · `highlights` (UNIQUE `(segment_id, user_id)`; colour yellow/green/blue/pink), `segment_comments`, `soundbites` (a meeting-level time range; `end_ms > start_ms`; the service also checks `end_ms ≤ duration_ms`) (Phase 11) · `chat_messages` (role user/assistant; `answered_by` llm/fallback) (Phase 12).
- **Delete rules:** deleting a meeting cascades to its segments (and through them to highlights and comments), summary, chapters, action items, soundbites, chat messages and association rows (FTS rows via triggers); never to participants, tags or the user. `speaker_id` RESTRICT; `assignee_id` SET NULL; deleting a tag only removes its links; `user_id` columns CASCADE.

## API summary (prefix `/api`; full tables: ARCHITECTURE.md §7)

- **Core:** `GET /health` · `GET, POST /meetings` (list filters `q, participant_id, date_from, date_to, sort=recent|oldest`) · `GET, PATCH, DELETE /meetings/{id}` · `POST /meetings/{id}/action-items` · `PATCH, DELETE /action-items/{id}` · `GET /participants`.
- **Bonus 2:** `GET, POST /tags` · `DELETE /tags/{id}`; adds `tag_id` to the list filters and `tag_ids` to the meeting PATCH.
- **Bonus 3:** `GET /meetings/{id}/export?content=transcript|summary&format=txt|md|pdf`.
- **Bonus 4:** `GET /search?q=`.
- **Bonus 5:** `PUT, DELETE /segments/{id}/highlight` · `GET, POST /segments/{id}/comments` · `PATCH, DELETE /comments/{id}` · `GET, POST /meetings/{id}/soundbites` · `PATCH, DELETE /soundbites/{id}`.
- **Bonus 6:** `GET, POST, DELETE /meetings/{id}/chat`.

Pydantic request/response models on every route; consistent error JSON; CORS limited to `CORS_ORIGINS`; interactive docs at `/docs`.

## Transcript formats (each parser returns `list[ParsedSegment(speaker, start_ms, end_ms, text)]`)

- `.txt`: one utterance per line, `[HH:MM:SS] Speaker Name: text` (also `[MM:SS]`). No timestamps at all → estimate at ~150 words/minute (state this in the README).
- `.vtt`: standard WEBVTT cues; speaker from `<v Name>` or a `Name:` prefix.
- `.json`: `[{"speaker": "...", "start": seconds, "end": seconds, "text": "..."}]`.
- A dispatcher picks the parser by format. Unknown speakers become participants. Invalid input → 422 with a clear message (line or item number). Sample files of all three formats go in `backend/samples/`.

## Seed data

Six realistic, **original** meetings (e.g. sprint planning, sales discovery call, design review, 1:1, investor update, customer-support escalation). Each: 15–45 min, 30–60 segments, 2–5 participants, hand-written summary and keywords, 4–6 chapters, 3–6 action items (some completed). Seeded automatically at startup when the database is empty. Bonus phases add their own seed data, a few of each across the meetings so the feature is visible immediately: 1–3 tags per meeting (Phase 8); highlights, comments and soundbites (Phase 11).

## UI direction

It must look like Fireflies, not a generic notes app: left sidebar navigation, purple accent, clean white cards, meeting rows with participant avatars, and a meeting page with the AI-notes panel, transcript panel and player. **Before building any UI, read `docs/reference/README.md`.** It indexes the reference screenshots (downloaded from Fireflies' public website and help center; local only, git-ignored), the sampled colour tokens (primary `#6938EF`, timestamp blue `#175CD3`, …) and layout notes. It also lists the states no image covers: design those by analogy, or ask the owner. The app is called **Glowworm**, with our own simple logo; never copy Fireflies' logo or images into the app.

## Deployment and environment variables

| Variable | Where | Local default |
|---|---|---|
| `DATABASE_URL` | backend | `sqlite:///./app.db` |
| `CORS_ORIGINS` | backend (comma-separated) | `http://localhost:3000,http://localhost:3001` |
| `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY` | backend, bonus 6 (Render env only; never in the repo or frontend) | unset → fallback answers |
| `NEXT_PUBLIC_API_URL` | frontend (inlined at build time) | `http://localhost:8000` |

- Render: root `backend/`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/api/health`, defined in `render.yaml`. The free tier has an ephemeral disk and sleeps when idle, so the DB re-seeds on startup (a README assumption). Vercel: root `frontend/`.
- Do as much of the deployment as possible directly (`npx vercel`, the `render.yaml` Blueprint). For steps that need the owner's browser login or a dashboard click, give exact numbered steps and wait. Exact deploy steps go in the README.

## Commands (available from Phase 1; dev machine is Windows / PowerShell)

Backend, from `backend/`:
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1           # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt  # runtime deps + pytest, httpx, ruff
uvicorn app.main:app --reload        # API on http://localhost:8000, docs at /docs
pytest
ruff check . ; ruff format .
```

Frontend, from `frontend/`:
```powershell
npm install
npm run dev -- -p 3001               # http://localhost:3001 (port 3000 is taken on the dev machine)
npm run lint
npm run format                       # Prettier; format:check in CI style
npm run build                        # also type-checks
```

## Known gotchas

- **Dev machine:** port 3000 belongs to Docker (a Grafana container). Never stop it; run the frontend on **3001** (the backend's local CORS default allows 3000 and 3001). Windows PowerShell's `Invoke-WebRequest` to `localhost` is very slow; use `curl` (Git Bash).
- **Writing files from Python on Windows:** pass `newline="\n"` to `write_text`, or the file gets CRLF line endings (git normalises them, but diffs get noisy).
- **Visual checks:** take headless screenshots and compare them with `docs/reference/`: `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=<scratch>/edge-profile --window-size=1440,900 --virtual-time-budget=8000 --screenshot=<file>.png http://localhost:3001/<page>`.

- **New tables or seed data:** `create_all()` creates missing tables on startup but never alters existing ones, and seed data only loads into an empty DB. Locally, delete `backend/app.db`; on Render every deploy starts from a fresh disk. Tell the owner whenever a phase needs this.
- **FTS5:** verify early (Phase 1) that Render's Python has it (it does locally, on SQLite 3.42). When the FTS table is added to an existing DB, run `INSERT INTO segments_fts(segments_fts) VALUES('rebuild')` at startup so rows that already exist get indexed.
- `with TestClient(app)` runs the startup lifespan (create tables, seed). Point tests at a temporary database before the app touches the real one.
- **Tailwind v4 dark mode:**
  - Tailwind v4 is configured in CSS. Class-based dark mode with `next-themes` needs `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css`.
  - Put CSS-variable overrides such as `.dark { --color-… }` inside `@layer base`. An unlayered `.dark {}` rule was dropped from the Turbopack **dev** server's CSS (the production build kept it).
  - To check what the browser actually got, grep the served CSS (`/_next/static/chunks/*.css`).
- **Stopping the dev server:** stopping its background shell can leave the `next` Node process running on port 3001 (then `EADDRINUSE`). Find it with `Get-NetTCPConnection -LocalPort 3001`, check that it's our `start-server.js`, and end it with `taskkill /PID <pid> /T /F`. Never touch port 3000 (Grafana).
- Next.js client pages that call `useSearchParams()` need a `<Suspense>` boundary, or the production build fails.
- **Scroll areas must be `relative`.**
  - Otherwise an absolutely positioned child, such as Tailwind's `sr-only` text, escapes the area and stretches the document. On the meeting page that made the whole page scrollable (1244 px in an 805 px window).
  - For the same reason, scroll a container with `container.scrollTo(...)`: `element.scrollIntoView()` also scrolls every scrollable ancestor.
- **New routes and `tsc`:** `PageProps<"/route">` types come from Next's generated route types. After adding a route, run `npx next typegen` (or `dev`/`build`) before `tsc --noEmit`.
- **fpdf2's built-in fonts only cover Western single-byte characters** (Latin-1 / Windows-1252), so other text (many non-English names, emoji) breaks PDF export. Phase 9 plan: bundle a free Unicode TTF (e.g. DejaVu Sans); confirm with the owner first.
- **LLM model names and SDK usage:** check current documentation at Phase 12; don't rely on memory.

## Phases

**Part 1: Core**
- [x] **Phase 0: Repo setup and docs (~1 h).** GitHub repo, `.gitignore`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `INTERVIEW_PREP.md`.
- [x] **Phase 1: Skeleton + early deploy (~1 h).** FastAPI `/api/health`; Next.js shell (sidebar + top bar); both deployed (Render + Vercel) and talking to each other. UI references: `docs/reference/README.md`.
- [x] **Phase 2: Backend core (~3 h).** Core models and relationships, schemas, parsers, summary generator, services, all core routes, seed data, pytest tests. No tags/search/export routes yet.
- [x] **Phase 3: Library page (~2 h).** List, title search, participant and date filters, sort, loading and empty states.
- [x] **Phase 4: Meeting page (~3 h).** Simulated player, two-way transcript sync, transcript search, summary / keywords / chapters / action-items panels.
- [ ] **Phase 5: CRUD UI + Fireflies experience (~2 h).** Create (upload/paste), edit, delete, action-item management, toasts, placeholder pages, UI pass against the screenshots.
- [ ] **Phase 6: Core deploy + verification (~45 min).** Deploy, walk the Core Gate on the live link, write the README's core sections, fix anything that fails. Report, then wait for "go".

**Part 2: Bonuses.** Each is its own phase: small commits, its tests, seed updates if relevant, ARCHITECTURE.md data flow, re-check the core, deploy, stop for "go".
- [x] **Phase 7: Dark mode (~45 min).** Built on 9 Oct (~01:50 IST) *before* Phases 5–6, at the owner's request, because of session limits. Phases 5 and 6 come next; the Core Gate still applies before the other bonuses.
- [ ] **Phase 8: Tags + filtering (~1.25 h)**
- [ ] **Phase 9: Export TXT / Markdown / PDF (~1 h)**
- [ ] **Phase 10: Global search, FTS5 (~1.25 h)**
- [ ] **Phase 11: Comments, highlights, soundbites (~2.5 h)**
- [ ] **Phase 12: "Ask about this meeting" chat (~2 h).** Before starting, ask the owner which LLM provider to use and to add the key on Render.

**Hard cut-off: Friday 15:00 IST.** A bonus still in progress then is finished within 15 minutes or reverted; then move to Phase 13. Never leave a half-built bonus in the deployed app.

- [ ] **Phase 13: Final polish and ship (~1.5 h, starts no later than 15:00).** Final deploy; complete README (setup, stack, architecture overview, schema + ER diagram, API overview, assumptions, which bonuses are done); test everything live; regenerate `INTERVIEW_PREP.md` and update `docs/ARCHITECTURE.md` from the final code (every bonus built); final commit and push; give the owner the GitHub URL and the live URL.
