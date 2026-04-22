# FIFA 2026 dashboard — cloud sync and deploy

The **database** is **[Supabase](https://supabase.com/)** (hosted Postgres). The app uses **one row** with `id = 'global'` for scores, notes, ticket highlights, and per-match ticket quantities — no rooms, no `?room=` parameter.

## One-time: create the database

1. Create a free Supabase project.
2. **SQL Editor** → paste `database/supabase.sql` → Run.
3. If you created the table **before** the `bought` column existed, also run `database/migration_add_bought.sql` once.
4. If the table predates **ticket quantities**, run `database/migration_add_ticket_counts.sql` once (new installs from `supabase.sql` already include it).
5. **Project Settings → API** → copy **Project URL** and **anon public** key.

## GitHub Pages

1. Add Actions secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
2. **Settings → Pages** → Source: **GitHub Actions**.
3. Push `main` (or run **Deploy GitHub Pages**). The workflow writes **`config.js`** and also **inlines the same Supabase URL + anon key into `index.html`**, so the pool works even if a second request to `config.js` fails (ad blockers, odd paths).

Anyone who loads the deployed site with cloud configured shares the **same** `global` row (updates within a few seconds via polling). Without cloud, each browser keeps its own copy in `localStorage`; two tabs on the same device still sync via the `storage` event.

### Optional: keys only in the HTML repo (no Actions secrets)

In `index.html`, find **`BUILTIN_SUPABASE`** (right after `config.js`) and paste **Project URL** and **anon key** into `url` / `anonKey`. They are public to anyone who views source—same as shipping `config.js`. Use a throwaway Supabase project for a casual pool.

### Sharing the link (everyone sees the same tickets/scores)

- **Recommended:** Configure **Supabase** (secrets above). Every visitor loads the shared `global` row; tickets and scores sync for everyone who opens your URL.
- **Without cloud:** The deploy includes **`public-board.json`** (same folder as `index.html`). On each load the app **merges** that file into the page, then saves a copy to the visitor’s `localStorage`. Commit updates to `public-board.json` in the repo (or set optional Actions secret `PUBLIC_BOARD_URL` to any HTTPS JSON URL) so **everyone opening the site** sees the same baseline. Live edits still stay local unless you also use cloud or refresh the JSON.

### Private / incognito windows

Browsers **isolate** storage for private or incognito mode from your normal windows. Opening the dashboard in incognito will **not** show scores or tickets you saved in a regular window—that is expected browser behavior, not a bug. **Cloud sync** (above) is how you get the same board in private windows and on other devices: the app loads from Supabase after the first fetch.

## Local testing

Copy `config.example.js` → `config.js`, fill keys, then:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Security note

Anonymous policies on `fifa_rooms` mean anyone with your anon key (visible in the static bundle) can read/write. Use only for casual pools; do not store sensitive data.

## Country / team flags

Schedule, bracket, and tickets use **PNG flags** from [flagcdn.com](https://flagcdn.com) (ISO codes in `index.html`), so they look the same on Windows, older browsers, and networks where **emoji flag sequences** do not render. The page loads small images from that CDN (allow `img-src` if you add a strict Content-Security-Policy).

## Match schedule source

Group-stage and knockout pairings are rebuilt from the post–draw schedule (see `scripts/schedule-source.txt` and `scripts/build-schedule.mjs`). Kickoffs are stored and shown as **US Eastern Time (ET)**. See `scripts/SCHEDULE_VERIFICATION.md` for how to verify data against [fifa.com](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026) before travel.

```bash
npm run build:schedule   # writes scripts/all_matches_generated.js — then merge into index.html ALL_MATCHES if you update the source table
```

## Automated tests

From the repo root (no separate terminal for `http.server` — **`npm test`** picks a free port and serves the site itself):

```bash
npm install && npx playwright install chromium && npm test
```

To use an **existing** server instead, set **`TEST_BASE`** (for example `http://127.0.0.1:8765/`) and run the individual scripts, or `TEST_BASE=... node scripts/test-with-server.mjs`.

- **`npm test`** runs `test:persist`, `test:ui`, and **`test:cloud`**.
- **`test:persist`** — score, **ticket**, and **note** survive reload (`localStorage`).
- **`test:ui`** — filter reset, ticket strip, destructive reset confirm.
- **`test:cloud`** — **skipped** unless you set `TEST_SUPABASE_URL` and `TEST_SUPABASE_ANON_KEY` (use a **disposable** Supabase project; the test writes match `1` score `7`, checks a ticket, and sets a comment). Optional: `TEST_MATCH_ID`.

```bash
TEST_SUPABASE_URL='https://xxxx.supabase.co' TEST_SUPABASE_ANON_KEY='eyJ...' npm run test:cloud
```
