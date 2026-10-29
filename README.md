# SpellingBee

A small Flask writing assistant that uses an OpenAI-compatible chat completions API to suggest spelling, grammar, punctuation, and clarity improvements.

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies: `python -m pip install -r requirements/requirements.txt`
3. Set `OPENAI_API_KEY` in your environment. The key stays on the server and is never sent to the browser.
4. Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`) and `OPENAI_BASE_URL` (defaults to `https://api.openai.com/v1`).
5. Start the app with `python app/main.py` from the `SpellingBee` directory. It listens on all network interfaces by default; set `HOST=127.0.0.1` to limit it to this computer.
6. Open `http://127.0.0.1:5000` on the computer running the app.

## Use it on phones, tablets, and desktops

SpellingBee is an installable web app (PWA). Deploy it to a host with HTTPS, then open its URL in a supported browser. On Android and desktop browsers, choose **Install app** (or **Add to Home Screen**). On iPhone or iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**. The app shell can open offline after it has loaded once; AI proofreading needs an internet connection.

For local network testing, find the computer's LAN IP and open `http://<computer-ip>:5000` from another device on the same network. Browsers require a secure HTTPS connection to install PWAs from network addresses; `localhost` is exempt for local development.

The proofread endpoint accepts up to 12,000 characters per request. Text is sent to the configured AI provider only after the user presses **Check my writing**.

You can also choose **Open a document** to load text from TXT, Markdown, DOCX, or text-based PDF files without copying and pasting. Documents up to 10 MB are read in memory and are not saved. Extracted text must fit the 12,000-character checker limit. Scanned PDFs and legacy `.doc` files are not supported.

## Check text in online editors

### Google Docs

Google Docs draws document text on a canvas, so a normal browser extension cannot reliably read or replace its document selection. Use the Google Docs sidebar integration instead:

1. Open **Extensions → Apps Script** in the document.
2. Paste `Code.gs` into the script editor. Add an HTML file named `Sidebar` and paste `Sidebar.html`. In **Project Settings**, enable **Show `appsscript.json` manifest file** and replace its contents with the provided manifest.
3. Save and reload the document. In the new **SpellingBee** menu, choose **Set app address** and enter your HTTPS app URL.
4. Select text in the document, choose **SpellingBee → Open writing checker**, load the selection, and check it. Review the suggestion before choosing **Replace selected text**.

The Docs integration replaces a selection within one paragraph to preserve surrounding formatting. It does not change the whole document at once.

### Other online editors

The browser extension in `integrations/browser-extension` works with selected text and common text fields or `contenteditable` editors:

1. Open your browser's extensions page, enable developer mode, and choose **Load unpacked** (Chrome/Edge) or **Load Temporary Add-on** (Firefox).
2. Select the `integrations/browser-extension` folder.
3. Set the SpellingBee app address in the extension popup. The browser asks you to allow the extension to connect to that address.
4. Select text in a supported writing editor (or focus its text field), open the extension, press **Save** once and approve the app connection, then review suggestions and choose **Replace in page**.

The extension only reads the active page after you open it. Some online editors use custom canvases or protected frames; use that editor's integration when available.

You can also download ready-to-load packages from **Browser extension** in the app header. Both packages are configured to point back to the current app. Chrome and Edge use the ZIP with **Load unpacked**; Firefox can load the `.xpi` from `about:debugging` as a temporary add-on. One-click permanent installation requires publishing a signed package in the browser's extension store.
