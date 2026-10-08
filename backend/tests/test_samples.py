"""The demo files in backend/samples/ parse to the same conversation in every format."""

from pathlib import Path

import pytest

from app.parsers import parse_transcript

SAMPLES = Path(__file__).parents[1] / "samples"


def _parse(file_name: str, transcript_format: str) -> list[tuple[str, str, int, int]]:
    text = (SAMPLES / file_name).read_text(encoding="utf-8")
    return [
        (s.speaker, s.text, s.start_ms, s.end_ms) for s in parse_transcript(text, transcript_format)
    ]


REFERENCE = _parse("offline-launch-plan.txt", "txt")


@pytest.mark.parametrize(
    ("file_name", "transcript_format"),
    [("offline-launch-plan.vtt", "vtt"), ("offline-launch-plan.json", "json")],
)
def test_timed_samples_match_the_txt_sample(file_name: str, transcript_format: str) -> None:
    assert _parse(file_name, transcript_format) == REFERENCE


def test_the_untimed_sample_has_the_same_lines_with_estimated_times() -> None:
    untimed = _parse("offline-launch-plan-no-timestamps.txt", "txt")

    assert [(speaker, text) for speaker, text, _, _ in untimed] == [
        (speaker, text) for speaker, text, _, _ in REFERENCE
    ]
    assert untimed[0][2] == 0  # estimated times start at zero
    assert len(REFERENCE) == 14
