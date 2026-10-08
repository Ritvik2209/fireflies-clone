import pytest

from app.parsers import ParsedSegment, TranscriptParseError, parse_transcript
from app.parsers.base import estimated_duration_ms, parse_timestamp


def _error(text: str, transcript_format: str) -> str:
    with pytest.raises(TranscriptParseError) as error:
        parse_transcript(text, transcript_format)
    return error.value.detail


# --- timestamps -------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "expected"),
    [("00:00", 0), ("01:05", 65_000), ("1:02:03", 3_723_000), ("00:00:01.5", 1_500)],
)
def test_parse_timestamp(value: str, expected: int) -> None:
    assert parse_timestamp(value) == expected


@pytest.mark.parametrize("value", ["1:75", "abc", "10", "00:00:61"])
def test_parse_timestamp_rejects_malformed_values(value: str) -> None:
    with pytest.raises(ValueError):
        parse_timestamp(value)


# --- txt --------------------------------------------------------------------------------


def test_txt_with_timestamps() -> None:
    text = """
    [00:00:05] Priya Shah: Morning all, let's get started.
    [00:01:10] Daniel Okafor: The sync fix is done
    and deployed to staging.
    [01:30] Priya Shah: Great.
    """

    segments = parse_transcript(text, "txt")

    assert segments == [
        ParsedSegment("Priya Shah", 5_000, 70_000, "Morning all, let's get started."),
        ParsedSegment(
            "Daniel Okafor", 70_000, 90_000, "The sync fix is done and deployed to staging."
        ),
        ParsedSegment("Priya Shah", 90_000, 90_000 + estimated_duration_ms("Great."), "Great."),
    ]


def test_txt_without_timestamps_estimates_times_at_150_words_per_minute() -> None:
    words = " ".join(["word"] * 150)  # one minute of speech

    segments = parse_transcript(f"Priya: {words}\nDaniel: {words}", "txt")

    assert [(s.speaker, s.start_ms, s.end_ms) for s in segments] == [
        ("Priya", 0, 60_000),
        ("Daniel", 60_000, 120_000),
    ]


def test_txt_rejects_a_first_line_without_a_speaker() -> None:
    assert _error("just some notes\nmore notes", "txt").startswith("Line 1: expected")


def test_txt_rejects_a_line_missing_its_timestamp() -> None:
    detail = _error("[00:00] Priya: Hi.\nDaniel: Hello.", "txt")

    assert detail == "Line 2: missing timestamp (the other lines have one)"


def test_txt_rejects_an_invalid_timestamp() -> None:
    assert _error("[00:75] Priya: Hi.", "txt").startswith("Line 1: invalid timestamp [00:75]")


def test_txt_rejects_an_empty_transcript() -> None:
    assert _error("  \n\n ", "txt") == "The transcript is empty"


# --- vtt --------------------------------------------------------------------------------

VTT = """WEBVTT

NOTE This block is a comment and is skipped.

1
00:00:01.000 --> 00:00:04.500
<v Priya Shah>Let's look at the <b>sprint goals</b>.</v>

00:00:05.000 --> 00:00:09.000 align:start
Daniel Okafor: The sync fix
is on staging.

00:00:10.000 --> 00:00:12.000
No speaker on this one.
"""


def test_vtt_reads_voice_tags_name_prefixes_and_multiline_cues() -> None:
    assert parse_transcript(VTT, "vtt") == [
        ParsedSegment("Priya Shah", 1_000, 4_500, "Let's look at the sprint goals."),
        ParsedSegment("Daniel Okafor", 5_000, 9_000, "The sync fix is on staging."),
        ParsedSegment("Unknown speaker", 10_000, 12_000, "No speaker on this one."),
    ]


def test_vtt_requires_the_header() -> None:
    assert _error("00:00:01.000 --> 00:00:02.000\nHi", "vtt").startswith("Not a WebVTT file")


def test_vtt_reports_the_line_of_a_bad_timing() -> None:
    detail = _error("WEBVTT\n\n00:00:09.000 --> 00:00:02.000\nHi", "vtt")

    assert detail == "Line 3: the cue ends before it starts"


# --- json -------------------------------------------------------------------------------


def test_json_converts_seconds_to_milliseconds() -> None:
    text = '[{"speaker": "Priya", "start": 1.25, "end": 4, "text": "  Hello   there "}]'

    assert parse_transcript(text, "json") == [ParsedSegment("Priya", 1_250, 4_000, "Hello there")]


def test_json_reports_syntax_errors_with_their_position() -> None:
    assert _error('[{"speaker": "Priya",}]', "json").startswith("Invalid JSON at line 1")


def test_json_must_be_a_non_empty_array() -> None:
    assert _error('{"speaker": "Priya"}', "json").startswith("Expected a non-empty JSON array")


def test_json_reports_which_item_is_invalid() -> None:
    text = '[{"speaker": "A", "start": 0, "end": 1, "text": "Hi"}, {"speaker": "B", "start": 1}]'

    assert _error(text, "json") == "Item 2: end: Field required"


def test_json_rejects_an_end_before_the_start() -> None:
    text = '[{"speaker": "A", "start": 5, "end": 1, "text": "Hi"}]'

    assert _error(text, "json") == "Item 1: end must not be before start"


# --- dispatcher -------------------------------------------------------------------------


def test_unknown_formats_are_rejected() -> None:
    assert _error("anything", "srt").startswith("Unsupported transcript format 'srt'")
