# Project MatchDay

Project MatchDay is a simple web page that displays the next football matches and in which Portuguese channels they can be watched.

## Technologies

This project was built using HTML, CSS, and JavaScript.

## How it works

- `zapping.json` holds the match/channel data, generated from the [zerozero.pt](https://www.zerozero.pt/) RSS "zapping" feed.
- A scheduled GitHub Action (`.github/workflows/update-zapping.yml`) downloads the RSS feed every hour, converts it to JSON via `rss2json.py`, and commits it back to the repository.
- `script.js` fetches `zapping.json`, `channel-icons.json` and `team-logos.json` and renders the upcoming matches in `index.html`, grouped by day, with live/soon indicators, team search and favourite teams (stored in `localStorage`). Finished matches (more than 2h after kickoff) are hidden.
- National teams use flags from [flagcdn.com](https://flagcdn.com), mapped from their Portuguese names in `national-team-flags.json`. Club badges come from `team-logos.json`, which `scripts/update_team_logos.py` fills incrementally (rate-limited TheSportsDB lookups) during the hourly workflow.
- `sw.js` is a service worker that caches the app and the last feed so the page keeps working offline.
- `channel-icons.json` holds the base64-encoded channel logos, loaded asynchronously to keep `constants.js` lightweight.

## Usage

Serve the folder over HTTP (e.g. `python3 -m http.server 8000`) and open `http://localhost:8000`. Opening `index.html` directly via `file://` does not work because the page uses `fetch`. Bump the `?v=` query on the assets in `index.html` when changing them, to bypass browser caches.

### Styling

This project uses a minimalist dark design. The match list is responsive and becomes a card layout on mobile.

## Development

```sh
npm install        # installs eslint + vitest
npm run lint       # lint JS
npm test           # unit tests for lib/matchParser.js

pip install -r requirements-dev.txt
pytest             # unit tests for rss2json.py
```

## Try it

https://rubenaraujo.github.io/project_matchday

## Credits

This project was created by Ruben Araujo.
