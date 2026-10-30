"""Start SpellingBee locally and provide a small desktop control window."""

from __future__ import annotations

import json
import logging
import os
import sys
import threading
import tkinter as tk
import webbrowser
from pathlib import Path
from tkinter import messagebox, simpledialog

from dotenv import load_dotenv
from werkzeug.serving import make_server
from app.main import app


def settings_path() -> Path:
    if sys.platform == "win32":
        base = Path(os.getenv("APPDATA", Path.home() / "AppData" / "Roaming"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.getenv("XDG_CONFIG_HOME", Path.home() / ".config"))
    return base / "SpellingBee" / ".env"


def main() -> None:
    config_path = settings_path()
    load_dotenv(config_path)

    root = tk.Tk()
    root.title("SpellingBee")
    root.resizable(False, False)
    root.geometry("350x190")

    if not os.getenv("OPENAI_API_KEY"):
        key = simpledialog.askstring(
            "Connect SpellingBee",
            "Enter your OpenAI API key. It will be stored on this computer only.",
            parent=root,
            show="•",
        )
        if not key or not key.strip():
            root.destroy()
            return
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(f"OPENAI_API_KEY={json.dumps(key.strip())}\n", encoding="utf-8")
        try:
            config_path.chmod(0o600)
        except OSError:
            pass
        os.environ["OPENAI_API_KEY"] = key.strip()

    logging.getLogger("werkzeug").addHandler(logging.NullHandler())
    logging.getLogger("werkzeug").propagate = False
    server = make_server("127.0.0.1", 0, app)
    address = f"http://127.0.0.1:{server.server_port}/"
    threading.Thread(target=server.serve_forever, daemon=True).start()

    tk.Label(root, text="SpellingBee is ready", font=("Arial", 16, "bold")).pack(pady=(24, 8))
    tk.Label(root, text="Your writing checker runs on this computer.").pack(pady=(0, 16))
    actions = tk.Frame(root)
    actions.pack()
    tk.Button(actions, text="Open checker", command=lambda: webbrowser.open(address)).pack(side="left", padx=6)

    def quit_app() -> None:
        server.shutdown()
        server.server_close()
        root.destroy()

    tk.Button(actions, text="Quit", command=quit_app).pack(side="left", padx=6)
    root.protocol("WM_DELETE_WINDOW", quit_app)
    root.after(250, lambda: webbrowser.open(address))
    root.mainloop()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        messagebox.showerror("SpellingBee could not start", str(error))
