"""
Configuration — reads secrets from environment via python-dotenv.
Never hardcode API keys in source code.
"""

from __future__ import annotations

import os
import logging

from dotenv import load_dotenv

load_dotenv()
# यदि आप `lyrflow/` के अंदर से रन कर रहे हैं, तो यही `.env` उठेगी।
# अगर आप repo root से रन कर रहे हैं, तो default python-dotenv `.env` से भी लोड हो जाएगा।
try:
    _here = os.path.dirname(__file__)
    load_dotenv(dotenv_path=os.path.join(_here, ".env"), override=False)
except Exception:
    pass

GENIUS_API_KEY = os.getenv("GENIUS_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# Genius OAuth client credentials (optional).
# आप सीधे Access Token `GENIUS_API_KEY` में दे सकते हैं,
# या फिर `Client_ID` + `Client_secret` दे सकते हैं (runtime OAuth token fetch).
GENIUS_CLIENT_ID = (
    os.getenv("GENIUS_CLIENT_ID", "").strip()
    or os.getenv("Client_ID", "").strip()
    or os.getenv("CLIENT_ID", "").strip()
)
GENIUS_CLIENT_SECRET = (
    os.getenv("GENIUS_CLIENT_SECRET", "").strip()
    or os.getenv("Client_secret", "").strip()
    or os.getenv("CLIENT_SECRET", "").strip()
)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "4000"))

RATE_LIMIT_SLEEP = float(os.getenv("RATE_LIMIT_SLEEP", "1.0"))  # seconds between OpenAI chunks
TRANSLATION_SLEEP = float(os.getenv("TRANSLATION_SLEEP", "0.3"))  # seconds between fallback translation calls

# Chunking for long songs
CHUNK_SIZE = int(os.getenv("LYRFLOW_CHUNK_SIZE", "40"))

_log = logging.getLogger(__name__)


def require_api_keys() -> None:
    """Raise if keys are missing (only used when actually calling external APIs)."""
    missing = []
    if not GENIUS_API_KEY and not (GENIUS_CLIENT_ID and GENIUS_CLIENT_SECRET):
        missing.append("GENIUS_API_KEY (or Client_ID + Client_secret for OAuth)")
    if not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise EnvironmentError(f"Missing required env vars: {', '.join(missing)}")


SONG_LIST = [
    {"title": "No More Dream", "artist": "BTS"},
    {"title": "Jump", "artist": "BTS"},
    {"title": "Pink Venom", "artist": "BLACKPINK"},
    {"title": "Hype Boy", "artist": "NewJeans"},
    {"title": "MIROH", "artist": "Stray Kids"},
    {"title": "Black Sorrow", "artist": "Park Byeong Hoon"},
    {"title": "Celebrity", "artist": "IU"},
    {"title": "Idol", "artist": "YOASOBI"},
    {"title": "Usseewa", "artist": "Ado"},
    {"title": "GO!!!", "artist": "FLOW"},
]

