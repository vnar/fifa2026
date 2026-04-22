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
3. Push `main` (or run **Deploy GitHub Pages**). The workflow publishes `index.html` + generated `config.js`.

Anyone who loads the deployed site with cloud configured shares the **same** `global` row (updates within a few seconds via polling). Without cloud, each browser keeps its own copy in `localStorage`; two tabs on the same device still sync via the `storage` event.

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

## Match schedule source

Group-stage and knockout pairings are rebuilt from the post–draw schedule (see `scripts/schedule-source.txt` and `scripts/build-schedule.mjs`). Kickoffs are stored and shown as **US Eastern Time (ET)**. See `scripts/SCHEDULE_VERIFICATION.md` for how to verify data against [fifa.com](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026) before travel.

```bash
npm run build:schedule   # writes scripts/all_matches_generated.js — then merge into index.html ALL_MATCHES if you update the source table
```

## Automated check (local persistence)

With `python3 -m http.server 8765` running:

```bash
npm install && npx playwright install chromium && npm run test:persist && npm run test:ui
```

`test:persist` checks that a score survives reload. `test:ui` checks filter reset, ticket strip, and destructive reset confirmation.
