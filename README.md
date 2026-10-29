# SpellingBee

A small Flask writing assistant that uses an OpenAI-compatible chat completions API to suggest spelling, grammar, punctuation, and clarity improvements.

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies: `python -m pip install -r requirements/requirements.txt`
3. Set `OPENAI_API_KEY` in your environment. The key stays on the server and is never sent to the browser.
4. Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`) and `OPENAI_BASE_URL` (defaults to `https://api.openai.com/v1`).
5. Start the app with `python app/main.py` from the `SpellingBee` directory.
6. Open `http://127.0.0.1:5000`.

The proofread endpoint accepts up to 12,000 characters per request. Text is sent to the configured AI provider only after the user presses **Check my writing**.
