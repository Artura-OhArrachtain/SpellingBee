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
