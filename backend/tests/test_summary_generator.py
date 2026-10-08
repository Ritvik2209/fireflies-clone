from app.parsers import ParsedSegment
from app.services.summary_generator import STOPWORDS, generate_notes

MINUTE = 60_000


def _segment(speaker: str, minute: float, text: str) -> ParsedSegment:
    start = round(minute * MINUTE)
    return ParsedSegment(speaker, start, start + 20_000, text)


def test_keywords_are_the_most_frequent_meaningful_words() -> None:
    notes = generate_notes(
        [
            _segment("Hannah Weiss", 0, "Our pricing question is about renewal pricing."),
            _segment("Jordan Blake", 1, "Pricing for the renewal includes a discount, Hannah."),
            _segment("Hannah Weiss", 2, "The discount and pricing work for us. Thanks!"),
        ]
    )

    assert notes.keywords[:3] == ["pricing", "renewal", "discount"]
    assert not set(notes.keywords) & STOPWORDS
    assert "hannah" not in notes.keywords  # speakers' names are not keywords


def test_action_items_come_from_commitments_with_the_speaker_and_moment() -> None:
    # "will" without a person committing ("That will be fine.") is not an action item.
    hannah = "That will be fine. I'll send the signed contract by Friday."
    notes = generate_notes(
        [
            _segment("Jordan Blake", 0, "Let's get started."),
            _segment("Jordan Blake", 3, "Will you send the contract?"),
            _segment("Hannah Weiss", 5, hannah),
            _segment("Daniel Okafor", 8, "We need to fix the token refresh bug before release."),
        ]
    )

    assert [(item.text, item.assignee, item.start_ms) for item in notes.action_items] == [
        ("I'll send the signed contract by Friday.", "Hannah Weiss", 5 * MINUTE),
        ("We need to fix the token refresh bug before release.", "Daniel Okafor", 8 * MINUTE),
    ]


def test_chapters_follow_five_minute_windows() -> None:
    notes = generate_notes(
        [
            _segment("Priya Shah", 0, "Sprint goals: offline sync for the mobile app."),
            _segment("Priya Shah", 2, "Offline sync is the sprint goal."),
            _segment("Daniel Okafor", 6, "Route optimization estimates, route API and caching."),
            _segment("Sam Rivera", 11.5, "Regression testing on Android devices."),
        ]
    )

    assert [chapter.start_ms for chapter in notes.chapters] == [0, 6 * MINUTE, 11.5 * MINUTE]
    # "sprint", "offline" and "sync" each appear twice in the first window.
    assert notes.chapters[0].title == "Sprint, offline and sync"
    assert notes.chapters[1].title.startswith("Route")


def test_overview_uses_the_first_substantial_sentences() -> None:
    notes = generate_notes(
        [
            _segment("Ravi Menon", 0, "Hi everyone. Can you hear me?"),
            _segment(
                "Ravi Menon",
                1,
                "Annual recurring revenue grew eighteen percent this quarter across all regions. "
                "Churn fell to two percent after the onboarding redesign shipped in July.",
            ),
        ]
    )

    assert notes.overview == (
        "Annual recurring revenue grew eighteen percent this quarter across all regions. "
        "Churn fell to two percent after the onboarding redesign shipped in July."
    )


def test_notes_are_marked_rule_based_and_handle_an_empty_transcript() -> None:
    notes = generate_notes([])

    assert notes.generated_by == "rule_based"
    assert (notes.overview, notes.keywords, notes.chapters, notes.action_items) == ("", [], [], [])
