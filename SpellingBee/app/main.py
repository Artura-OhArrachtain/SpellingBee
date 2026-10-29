"""Web application for spelling and grammar assistance."""

from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, jsonify, render_template, request, send_from_directory
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = Flask(__name__, template_folder="../templates", static_folder="../static")


def proofread_with_ai(text: str) -> dict[str, str]:
    """Ask an OpenAI-compatible chat completions endpoint to proofread text."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("AI proofreading is not configured. Set OPENAI_API_KEY to enable it.")

    endpoint = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    payload = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Proofread the user's text for spelling, grammar, punctuation, and clarity. "
                    "Preserve its meaning, tone, and language. Return only valid JSON with "
                    "these string fields: corrected_text and explanation."
                ),
            },
            {"role": "user", "content": text},
        ],
        "response_format": {"type": "json_object"},
    }
    api_request = Request(
        f"{endpoint}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(api_request, timeout=45) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in (401, 403):
            raise RuntimeError("The AI service rejected the API key. Check OPENAI_API_KEY.") from error
        raise RuntimeError(f"The AI service returned an error (HTTP {error.code}).") from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError("Could not connect to the AI service. Try again shortly.") from error
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise RuntimeError("The AI service returned an unreadable response.") from error

    try:
        content = result["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        corrected = parsed["corrected_text"]
        explanation = parsed.get("explanation", "")
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        raise RuntimeError("The AI service returned a response in an unexpected format.") from error
    if not isinstance(corrected, str) or not isinstance(explanation, str):
        raise RuntimeError("The AI service returned a response in an unexpected format.")
    return {"corrected_text": corrected, "explanation": explanation}


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/service-worker.js")
def service_worker():
    response = send_from_directory(app.static_folder, "service-worker.js")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.post("/api/proofread")
def proofread():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get("text"), str):
        return jsonify(error="Enter some text to check."), 400
    text = data["text"].strip()
    if not text:
        return jsonify(error="Enter some text to check."), 400
    if len(text) > 12000:
        return jsonify(error="Text must be 12,000 characters or fewer."), 413
    try:
        return jsonify(proofread_with_ai(text))
    except RuntimeError as error:
        return jsonify(error=str(error)), 503


if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "5000")), debug=False)
