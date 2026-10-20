#!/usr/bin/env python3
"""
Refresh Google reviews for Disha Tuitions.

Usage:
  python scripts/refresh-reviews.py

Writes: data/google-reviews.json
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PLACE_ID = "ChIJkTNvKdAVrjsRYLzMngGdN0Q"
PLACE_NAME = "Disha Tuitions"
API_URL = (
    "https://service-reviews-ultimate.elfsight.com/data/reviews"
    f"?uri={PLACE_ID}"
)

# Google's overall figures; the feed omits some reviews, so update these from the Maps listing.
GOOGLE_TOTAL = 101
GOOGLE_RATING = 5.0

HIGHLIGHTS = [
    "Personalized teaching style improving grades and confidence",
    "Creates fun and productive learning environment for students",
    "Encourages love for subject and ensures crystal-clear understanding",
]

ROOT = Path(__file__).resolve().parents[1]
OUT_FILE = ROOT / "data" / "google-reviews.json"


MAX_PAGES = 50  # safety cap; the feed returns 20 reviews per page


def fetch_all_reviews() -> list[dict]:
    """Walk ?page=N until the feed returns an empty page."""
    items: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        batch = fetch_reviews(page)
        if not batch:
            break
        items.extend(batch)
    return items


def fetch_reviews(page: int = 1, retries: int = 5) -> list[dict]:
    req = urllib.request.Request(
        f"{API_URL}&page={page}",
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; DishaTuitionsReviewRefresh/1.0)",
            "Accept": "application/json",
            "Origin": "https://dishatuitions.in",
            "Referer": "https://dishatuitions.in/",
        },
    )

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            if payload.get("status") != "success":
                raise RuntimeError(f"Unexpected API response: {payload!r}")
            data = payload.get("result", {}).get("data")
            if not isinstance(data, list):
                raise RuntimeError("API returned no review list")
            return data
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt < retries:
                wait = attempt * 2
                print(f"Attempt {attempt}/{retries} failed ({exc}). Retrying in {wait}s...")
                time.sleep(wait)

    assert last_error is not None
    raise last_error


def to_date(ts) -> str | None:
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OSError, OverflowError):
        return None


def normalize(raw_items: list[dict]) -> dict:
    reviews = []
    ratings: list[float] = []

    for item in raw_items:
        rating = item.get("rating")
        try:
            rating_num = float(rating) if rating is not None else None
        except (TypeError, ValueError):
            rating_num = None
        if rating_num is not None:
            ratings.append(rating_num)

        text = item.get("text")
        if isinstance(text, str):
            text = text.strip() or None
        else:
            text = None

        reviews.append(
            {
                "name": item.get("reviewer_name") or "Anonymous",
                "rating": rating_num if rating_num is not None else 5,
                "text": text,
                "photo": item.get("reviewer_picture_url"),
                "date": to_date(item.get("published_at")),
                "url": item.get("url"),
            }
        )

    avg = round(sum(ratings) / len(ratings), 1) if ratings else 0

    return {
        "placeId": PLACE_ID,
        "name": PLACE_NAME,
        "rating": GOOGLE_RATING,
        "total": max(GOOGLE_TOTAL, len(reviews)),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "mapsUrl": f"https://www.google.com/maps/place/?q=place_id:{PLACE_ID}",
        "writeReviewUrl": f"https://search.google.com/local/writereview?placeid={PLACE_ID}",
        "highlights": HIGHLIGHTS,
        "reviews": reviews,
    }


def main() -> int:
    print(f"Fetching Google reviews for {PLACE_NAME} ({PLACE_ID})...")
    try:
        raw = fetch_all_reviews()
    except urllib.error.HTTPError as exc:
        print(f"HTTP error: {exc.code} {exc.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Network error: {exc.reason}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Failed: {exc}", file=sys.stderr)
        return 1

    print(f"Received {len(raw)} reviews from API")
    lean = normalize(raw)
    with_text = sum(1 for r in lean["reviews"] if r.get("text"))

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(lean, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {OUT_FILE}")
    print(f"Total: {lean['total']}  |  With text: {with_text}  |  Avg: {lean['rating']}")
    print("Done. Commit & push data/google-reviews.json to update the live site.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
