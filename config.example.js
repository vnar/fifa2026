// Copy to config.js (same folder as index.html) and fill in from Supabase:
// Project Settings → API → Project URL + anon public key
// config.js is gitignored; GitHub Actions injects it at deploy from repo secrets.

window.__FIFA_SUPABASE__ = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_ANON_KEY',
};
