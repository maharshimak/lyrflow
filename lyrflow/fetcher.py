"""
fetcher.py — fetch lyrics from Genius with sha256 caching.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
import urllib.error
import urllib.request

from lyrflow.config import GENIUS_CLIENT_ID, GENIUS_CLIENT_SECRET

_log = logging.getLogger(__name__)

_GeniusTokenCache: dict[str, object] = {"token": "", "expires_at": 0.0}


def _cache_dir() -> str:
    path = os.path.join("lyrflow", "cache")
    os.makedirs(path, exist_ok=True)
    return path


def _cache_path(title: str, artist: str) -> str:
    key = f"{artist}::{title}".encode("utf-8")
    digest = hashlib.sha256(key).hexdigest()
    return os.path.join(_cache_dir(), f"{digest}.txt")


def _clean_genius_lyrics(lyrics: str, title: str) -> str:
    if not lyrics:
        return lyrics

    # Strip trailing "...123Embed" artifacts.
    lyrics = re.sub(r"\d*Embed$", "", lyrics).strip()

    # Strip first line if it duplicates the song title (common Genius artifact).
    lines = lyrics.split("\n")
    if lines and title and title.lower() in lines[0].lower():
        lines = lines[1:]
    return "\n".join(lines).strip()


def fetch_lyrics(title: str, artist: str, api_key: str) -> str | None:
    """
    Fetch raw lyrics from Genius API.
    Returns cleaned lyrics string or None if not found.
    """
    try:
        access_token = api_key.strip() if api_key else ""

        # If access token not provided, try OAuth with Client_ID + Client_secret.
        if not access_token:
            now = time.time()
            cached_token = str(_GeniusTokenCache.get("token", ""))
            cached_exp = float(_GeniusTokenCache.get("expires_at", 0.0))

            if cached_token and cached_exp > now + 30:
                access_token = cached_token
            elif GENIUS_CLIENT_ID and GENIUS_CLIENT_SECRET:
                token_url = "https://api.genius.com/oauth/token"
                payload = json.dumps(
                    {
                        "client_id": GENIUS_CLIENT_ID,
                        "client_secret": GENIUS_CLIENT_SECRET,
                        "grant_type": "client_credentials",
                    }
                ).encode("utf-8")

                req = urllib.request.Request(token_url, data=payload, method="POST")
                req.add_header("Content-Type", "application/json")
                req.add_header("Accept", "application/json")

                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                    access_token = data.get("access_token", "") or ""
                    expires_in = int(data.get("expires_in", 3600))
                    if access_token:
                        _GeniusTokenCache["token"] = access_token
                        _GeniusTokenCache["expires_at"] = time.time() + max(0, expires_in)
                except urllib.error.HTTPError as e:
                    body = e.read().decode("utf-8", errors="ignore")
                    _log.warning("Genius OAuth failed HTTP %s %s: %s", e.code, e.reason, body[:500])
                except Exception as e:
                    _log.warning("Genius OAuth failed: %s", e)

        if not access_token:
            _log.warning("No Genius access token available; skipping fetch for %s — %s", title, artist)
            return None

        # lyricsgenius (newer versions) may rely on typing.Self (Python 3.11+).
        # For Python 3.10, we patch it using typing_extensions if available.
        import typing

        if not hasattr(typing, "Self"):
            try:
                from typing_extensions import Self as _Self  # type: ignore

                typing.Self = _Self  # type: ignore[attr-defined]
            except Exception:
                # If typing_extensions isn't available, we still try importing lyricsgenius;
                # it may fail and will be handled by the outer exception handler.
                pass

        import lyricsgenius

        path = _cache_path(title, artist)
        if os.path.exists(path):
            _log.info("Cache hit: %s — %s", title, artist)
            with open(path, "r", encoding="utf-8") as f:
                return f.read()

        genius = lyricsgenius.Genius(
            access_token,
            verbose=False,
            skip_non_songs=True,
            excluded_terms=["(Remix)", "(Live)", "(Cover)"],
        )
        song = genius.search_song(title, artist)
        if not song:
            _log.warning("Song not found on Genius: %s — %s", title, artist)
            return None

        lyrics = song.lyrics
        lyrics = _clean_genius_lyrics(lyrics, title)

        if lyrics:
            with open(path, "w", encoding="utf-8") as f:
                f.write(lyrics)

        return lyrics.strip() if lyrics else None
    except Exception as e:
        _log.warning("Genius fetch failed for '%s' by '%s': %s", title, artist, e)
        return None

