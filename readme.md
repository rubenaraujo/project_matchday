# Project MatchDay

Project MatchDay is a simple web page that displays the next football matches and in which Portuguese channels they can be watched.

## Technologies

This project was built using HTML, CSS, and JavaScript.

## How it works

- `zapping.json` holds the match/channel data, generated from the [zerozero.pt](https://www.zerozero.pt/) RSS "zapping" feed.
- A scheduled GitHub Action (`.github/workflows/update-zapping.yml`) downloads the RSS feed every hour, converts it to JSON via `rss2json.py`, and commits it back to the repository.
- `script.js` fetches `zapping.json` and `channel-icons.json` and renders the matches table in `index.html`.
- `channel-icons.json` holds the base64-encoded channel logos, loaded asynchronously to keep `constants.js` lightweight.

## Usage

To use this project, simply open the `index.html` file in a web browser. The page will automatically fetch the latest news from the RSS feed and display it in a table.

### Styling

This project uses a modern, minimalist design with a black and white color scheme. The table is fully responsive and will adapt to different screen sizes.

## Try it

https://rubenaraujo.github.io/project_matchday

## Credits

This project was created by Ruben Araujo.
