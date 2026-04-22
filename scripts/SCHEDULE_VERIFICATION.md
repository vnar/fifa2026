# FIFA World Cup 2026 schedule data

All match rows in `index.html` (or output from `node scripts/build-schedule.mjs`) are **manually curated** from draw-aligned sources. They are **not** live-synced from FIFA.

Before relying on kickoff times for travel:

1. Open the official hub:  
   https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026  
2. Open **Matches** and cross-check date, time (convert to Eastern Time if shown in local stadium time), venue, and pairing.
3. Update `index.html` or `scripts/schedule-source.txt` and rebuild if you find discrepancies.

The app displays times as **US Eastern Time (ET)**. Eastern includes EST/EDT depending on the date in June–July 2026.

Do not add automated FIFA scraping here unless you have explicit permission and a maintained compliance process.
