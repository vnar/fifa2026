# FIFA 2026 dashboard — cloud sync and deploy

The **database** is a table on **[Supabase](https://supabase.com/)** (hosted Postgres in the cloud). It is **not** stored in this git repo.

## One-time: create the database

1. Create a free Supabase project.
2. Open **SQL Editor**, paste the contents of `database/supabase.sql`, and run it.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

## GitHub Pages (recommended)

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Secrets and variables → Actions** and add:
   - `SUPABASE_URL` — your Project URL  
   - `SUPABASE_ANON_KEY` — your anon public key  
3. Enable Pages: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Push to `main` (or run the **Deploy GitHub Pages** workflow manually). The workflow writes `site/config.js` from secrets and publishes `index.html` + `config.js`.

After deploy, open the Pages URL. Each visit gets a **`?room=`** id in the address bar; share that URL so everyone edits the same scores and notes.

## Local testing

Copy `config.example.js` to `config.js`, fill in `url` and `anonKey`, and serve the folder over HTTP (not `file://` if the browser blocks `fetch`):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Security note

Row policies allow anonymous read/write on `fifa_rooms`. Access control is the **secret room id** in the URL (same idea as an unlisted Google Doc). Do not use this for sensitive data.

## Why two browsers do not show the same scores

Without Supabase, data lives in **each browser’s own storage**. Two different browsers (or a phone and a laptop) **cannot** see each other’s updates.

With **cloud** enabled, everyone must use the **exact same URL**, including the same `?room=…` value. After a change, the other person’s screen updates within a few seconds (polling).

In **one browser**, two tabs now share the same default room when you open the site without `?room=` (this browser remembers the last room), and tabs **sync live** via the `storage` event.

## Automated check (local persistence)

From the repo root, with `python3 -m http.server 8765` running in another terminal:

```bash
npm install
npx playwright install chromium
npm run test:persist
```

This asserts that a score survives a full page reload (localStorage + `?room=`). It does not validate Supabase unless you set `TEST_BASE` to your deployed URL and add a `config.js` next to the served `index.html` with valid keys.
