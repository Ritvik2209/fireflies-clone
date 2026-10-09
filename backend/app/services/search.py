"""Global search (bonus 4): every transcript line the user owns, ranked by relevance (FTS5)."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import User
from app.models.types import UTCDateTime

MAX_RESULTS = 50

# Plain SQL, because SQLAlchemy has no model for the FTS5 table (ARCHITECTURE.md §6.6).
# - MATCH uses the full-text index; bm25() ranks the best matches lowest, hence ascending order.
# - snippet() returns the text around the match (about 12 words), each match wrapped in the
#   control characters \x02 … \x03 (not HTML), which the frontend turns into <mark>.
_SEARCH = text(
    """
    SELECT s.id AS segment_id, s.meeting_id, m.title AS meeting_title, m.meeting_date,
           p.name AS speaker_name, p.avatar_color AS speaker_color, s.start_ms,
           snippet(segments_fts, 0, char(2), char(3), '…', 12) AS snippet
    FROM segments_fts
    JOIN transcript_segments AS s ON s.id = segments_fts.rowid
    JOIN meetings AS m ON m.id = s.meeting_id
    JOIN participants AS p ON p.id = s.speaker_id
    WHERE segments_fts MATCH :query AND m.owner_id = :owner_id
    ORDER BY bm25(segments_fts)
    LIMIT :limit
    """
).columns(meeting_date=UTCDateTime())  # read back as aware UTC, like the ORM's columns


def fts_query(raw: str) -> str | None:
    """User input as a safe FTS5 query ("all these words"), or None if it has no words.

    FTS5 has its own query syntax, so raw input such as `don't` or `budget AND` is an error.
    Each word is double-quoted instead (a quote inside a word is doubled), which FTS5 reads as
    plain text; the value is also a bound parameter, so nothing is ever spliced into the SQL.
    """
    words = [word for word in raw.split() if any(char.isalnum() for char in word)]
    if not words:
        return None
    return " ".join('"' + word.replace('"', '""') + '"' for word in words)


def search(db: Session, owner: User, raw_query: str) -> list[dict[str, object]]:
    query = fts_query(raw_query)
    if query is None:
        return []
    rows = db.execute(_SEARCH, {"query": query, "owner_id": owner.id, "limit": MAX_RESULTS})
    return [dict(row) for row in rows.mappings()]
