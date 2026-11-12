# SpellingBee

A small Flask writing assistant that uses an OpenAI-compatible chat completions API to suggest spelling, grammar, punctuation, and clarity improvements.

SpellingBee can run as a local web app, an installable progressive web app (PWA), or a packaged desktop app. It also includes integrations for Google Docs and browser-based editors.

## Requirements

- Python 3.10 or newer
- An API key for an OpenAI-compatible chat completions provider
- A modern browser (Chrome, Edge, Firefox, or Safari)

## Run locally

From the repository root:

```bash
cd SpellingBee
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
python -m pip install -r requirements/requirements.txt
export OPENAI_API_KEY="your-api-key" # Windows PowerShell: $env:OPENAI_API_KEY="your-api-key"
python app/main.py
```

Open `http://127.0.0.1:5000`. The server listens on all network interfaces by default; set `HOST=127.0.0.1` to limit it to this computer. Set `PORT` to use a different port.

### Configuration

Configuration can be provided as environment variables or in `SpellingBee/.env` for local development. The API key stays on the server and is never sent to the browser.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | Required provider API key |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API base URL |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model used for proofreading |
| `HOST` | `0.0.0.0` | Listening address |
| `PORT` | `5000` | Listening port |

Proofreading has no application-level word or character limit. Uploaded TXT, Markdown, DOCX, and text-based PDF files are limited to 10 MB and are processed in memory rather than saved. Very large requests can still be limited by the configured AI provider's context window.

## Download the desktop app

Download the latest [Windows installer](https://github.com/Artura-OhArrachtain/SpellingBee/releases/latest/download/SpellingBee-Windows-Setup.exe) or [macOS disk image](https://github.com/Artura-OhArrachtain/SpellingBee/releases/latest/download/SpellingBee-macOS.dmg) from Releases. On Windows, run the installer and use the Start Menu or desktop shortcut. On macOS, open the disk image and drag SpellingBee to Applications. Portable [Windows](https://github.com/Artura-OhArrachtain/SpellingBee/releases/latest/download/SpellingBee-Windows.zip) and [macOS](https://github.com/Artura-OhArrachtain/SpellingBee/releases/latest/download/SpellingBee-macOS.zip) downloads are also available. On first launch, enter an OpenAI API key; it is saved in your user settings on that computer. The desktop app runs the checker locally and opens it in your default browser. Choose **Quit** in its control window to stop the local server.

Because the desktop builds are not signed yet, macOS may require Control-clicking the app and choosing **Open** the first time, and Windows SmartScreen may require choosing **More info → Run anyway**.

The packaged browser extension defaults to the hosted app at `https://tab.pythonanywhere.com`. You can change the app address in the extension popup to another HTTP or HTTPS SpellingBee deployment.

Desktop packages are attached to version releases. To build them, push a version tag such as `v1.0.0`.

## Use it on phones, tablets, and desktops

SpellingBee is an installable web app (PWA). Deploy it to a host with HTTPS, then open its URL in a supported browser. On Android and desktop browsers, choose **Install app** (or **Add to Home Screen**). On iPhone or iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**. The app shell can open offline after it has loaded once; AI proofreading needs an internet connection.

For local network testing, find the computer's LAN IP and open `http://<computer-ip>:5000` from another device on the same network. Browsers require a secure HTTPS connection to install PWAs from network addresses; `localhost` is exempt for local development.

Text is sent to the configured AI provider only after the user presses **Check my writing**.

You can also choose **Open a document** to load text from TXT, Markdown, DOCX, or text-based PDF files without copying and pasting. Documents up to 10 MB are read in memory and are not saved. Scanned PDFs and legacy `.doc` files are not supported.

## Check text in online editors

### Google Docs

Google Docs draws document text on a canvas, so a normal browser extension cannot reliably read or replace its document selection. Use the Google Docs sidebar integration instead:

1. Open **Extensions → Apps Script** in the document.
2. Paste `Code.gs` into the script editor. Add an HTML file named `Sidebar` and paste `Sidebar.html`. In **Project Settings**, enable **Show `appsscript.json` manifest file** and replace its contents with the provided manifest.
3. Save and reload the document. The integration connects automatically to `https://tab.pythonanywhere.com`.
4. Choose **SpellingBee → Open writing checker**, select a passage, and choose **Mark corrections**. SpellingBee replaces the selected passage with the corrected version and highlights the changed portions directly in the document.

The Docs integration connects to `https://tab.pythonanywhere.com` and replaces a selection within one paragraph to preserve surrounding formatting. Changed text is highlighted in yellow and underlined for review. It uses the same `/api/proofread` endpoint as the browser extension, but keeps the Google Docs selection and marking flow inside Apps Script.

### Other online editors

The browser extension in `integrations/browser-extension` works with selected text and common text fields or `contenteditable` editors:

1. Open your browser's extensions page, enable developer mode, and choose **Load unpacked** (Chrome/Edge) or **Load Temporary Add-on** (Firefox).
2. Select the `integrations/browser-extension` folder.
3. Set the SpellingBee app address in the extension popup. The browser asks you to allow the extension to connect to that address.
4. Select text in a supported writing editor (or focus its text field), open the extension, press **Save** once and approve the app connection, then review suggestions and choose **Replace in page**.

The extension only reads the active page after you open it. Some online editors use custom canvases or protected frames; use that editor's integration when available. The extension detects `docs.google.com` and directs you to the Google Docs sidebar instead of trying to edit the document.

You can also download ready-to-load packages from **Browser extension** in the app header. Both packages are configured to point back to the current app. Chrome and Edge use the ZIP with **Load unpacked**; Firefox can load the `.xpi` from `about:debugging` as a temporary add-on. One-click permanent installation requires publishing a signed package in the browser's extension store.

### Browser extension store listing

The extension includes Manifest V3 metadata and PNG icons for store submission. The prepared upload package is available at `dist/spellingbee-browser-extension-1.0.0.zip`, and the listing text, permission explanations, data-use disclosure, and screenshot checklist are in `docs/browser-extension-store-listing.md`.

Before submitting, deploy the app over HTTPS, publish its `/privacy` page, replace the privacy policy placeholder URL in the listing draft, and capture the required store screenshots. The extension's privacy policy is available at `/privacy` on every app deployment.

## Project layout

- `SpellingBee/app/main.py` — Flask application and API endpoints
- `SpellingBee/templates/` and `SpellingBee/static/` — web interface and PWA assets
- `SpellingBee/desktop.py` — local desktop launcher
- `integrations/browser-extension/` — Chrome, Edge, and Firefox extension source
- `integrations/google-docs/` — Google Docs Apps Script sidebar integration
- `docs/` — publishing and store-listing documentation

## API endpoints

- `GET /` — web app
- `GET /api/health` — health check
- `POST /api/proofread` — proofread JSON `{ "text": "..." }`
- `POST /api/open-document` — extract text from an uploaded supported document
- `GET /privacy` — privacy policy

## Deployment

Deploy the Flask app behind HTTPS when making it available to other devices or when installing the PWA. The browser extension can connect to HTTP or HTTPS app addresses, including `localhost` and LAN addresses for local testing. The desktop installer workflow runs when a tag matching `v*` is pushed and publishes Windows and macOS archives to a GitHub Release.
