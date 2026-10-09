"""Export a meeting's transcript or notes as TXT, Markdown or PDF (bonus 3).

Each export is first built as a small outline (title, details, sections of items), then written
out by one renderer per format, so the three formats always contain the same information.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from fpdf import FPDF

from app.models import Meeting

ExportContent = Literal["transcript", "summary"]
ExportFormat = Literal["txt", "md", "pdf"]

MEDIA_TYPES: dict[str, str] = {
    "txt": "text/plain; charset=utf-8",
    "md": "text/markdown; charset=utf-8",
    "pdf": "application/pdf",
}
# fpdf2's built-in fonts only cover Latin-1, so PDFs use DejaVu Sans (bundled, free licence).
FONTS = Path(__file__).resolve().parent.parent / "fonts"


@dataclass
class Item:
    """One entry in a section. `label` is the speaker and time of a transcript line."""

    kind: Literal["paragraph", "bullet", "task", "line"]
    text: str
    label: str = ""
    done: bool = False


@dataclass
class Section:
    heading: str
    items: list[Item] = field(default_factory=list)


@dataclass
class Outline:
    title: str
    details: list[str]
    sections: list[Section]


@dataclass
class ExportFile:
    filename: str
    media_type: str
    body: bytes


def export_meeting(meeting: Meeting, content: ExportContent, fmt: ExportFormat) -> ExportFile:
    outline = _transcript(meeting) if content == "transcript" else _summary(meeting)
    if fmt == "txt":
        body = _to_text(outline).encode("utf-8")
    elif fmt == "md":
        body = _to_markdown(outline).encode("utf-8")
    else:
        body = _to_pdf(outline)
    slug = re.sub(r"[^a-z0-9]+", "-", meeting.title.lower()).strip("-")[:60] or "meeting"
    return ExportFile(f"{slug}-{content}.{fmt}", MEDIA_TYPES[fmt], body)


def timestamp(ms: int) -> str:
    """'05:12', or '1:02:03' from the first hour on (both import back as .txt timestamps)."""
    seconds = ms // 1000
    hours, minutes, secs = seconds // 3600, seconds % 3600 // 60, seconds % 60
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes:02d}:{secs:02d}"


def _details(meeting: Meeting) -> list[str]:
    # The server doesn't know the reader's time zone, so dates are explicit UTC.
    when = meeting.meeting_date.strftime("%a, %d %b %Y, %H:%M UTC")
    details = [f"{when} · {round(meeting.duration_ms / 60_000)} min"]
    details.append("Participants: " + ", ".join(person.name for person in meeting.participants))
    if meeting.tags:
        details.append("Tags: " + ", ".join(tag.name for tag in meeting.tags))
    return details


def _transcript(meeting: Meeting) -> Outline:
    names = {person.id: person.name for person in meeting.participants}
    lines = [
        Item(
            "line",
            segment.text,
            label=f"[{timestamp(segment.start_ms)}] {names[segment.speaker_id]}",
        )
        for segment in meeting.segments
    ]
    return Outline(meeting.title, _details(meeting), [Section("Transcript", lines)])


def _summary(meeting: Meeting) -> Outline:
    names = {person.id: person.name for person in meeting.participants}
    sections: list[Section] = []
    if meeting.summary is None:
        sections.append(Section("Overview", [Item("paragraph", "No notes for this meeting.")]))
    else:
        sections.append(Section("Overview", [Item("paragraph", meeting.summary.overview)]))
        keywords = ", ".join(meeting.summary.keywords)
        sections.append(Section("Keywords", [Item("paragraph", keywords)]))

    chapters = meeting.chapters
    ends = [chapter.start_ms for chapter in chapters[1:]] + [meeting.duration_ms]
    sections.append(
        Section(
            "Chapters",
            [
                Item("bullet", f"{timestamp(c.start_ms)} – {timestamp(end)}  {c.title}")
                for c, end in zip(chapters, ends, strict=True)
            ],
        )
    )

    tasks = []
    for item in meeting.action_items:
        who = names[item.assignee_id] if item.assignee_id is not None else "Unassigned"
        when = f" ({timestamp(item.source_start_ms)})" if item.source_start_ms is not None else ""
        tasks.append(Item("task", f"{item.text} — {who}{when}", done=item.is_completed))
    sections.append(Section("Action items", tasks or [Item("paragraph", "No action items.")]))
    return Outline(meeting.title, _details(meeting), sections)


def _to_text(outline: Outline) -> str:
    out = [outline.title, "=" * len(outline.title), *outline.details]
    for section in outline.sections:
        out += ["", section.heading, "-" * len(section.heading)]
        for item in section.items:
            if item.kind == "line":
                out.append(f"{item.label}: {item.text}")  # the .txt import format
            elif item.kind == "bullet":
                out.append(f"- {item.text}")
            elif item.kind == "task":
                out.append(f"[{'x' if item.done else ' '}] {item.text}")
            else:
                out.append(item.text)
    return "\n".join(out) + "\n"


def _to_markdown(outline: Outline) -> str:
    out = [f"# {outline.title}", "", *(f"- {detail}" for detail in outline.details)]
    for section in outline.sections:
        if out[-1] != "":
            out.append("")  # exactly one blank line before each heading
        out += [f"## {section.heading}", ""]
        for item in section.items:
            if item.kind == "line":
                out += [f"**{item.label}**  ", item.text, ""]
            elif item.kind == "bullet":
                out.append(f"- {item.text}")
            elif item.kind == "task":
                out.append(f"- [{'x' if item.done else ' '}] {item.text}")
            else:
                out += [item.text, ""]
    return "\n".join(out).rstrip() + "\n"


def _to_pdf(outline: Outline) -> bytes:
    pdf = FPDF()  # A4, millimetres
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("DejaVu", "", FONTS / "DejaVuSans.ttf")
    pdf.add_font("DejaVu", "B", FONTS / "DejaVuSans-Bold.ttf")
    pdf.set_title(outline.title)
    pdf.add_page()

    def write(
        text: str, size: float, bold: bool = False, gray: bool = False, gap: float = 0
    ) -> None:
        pdf.set_font("DejaVu", "B" if bold else "", size)
        if gray:
            pdf.set_text_color(102, 112, 133)  # the app's gray-500, for secondary text
        else:
            pdf.set_text_color(16, 24, 40)  # gray-900
        # Wraps long text onto as many lines as needed, then moves to the next line.
        pdf.multi_cell(0, size * 0.5, text, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(gap)

    write(outline.title, 18, bold=True, gap=2)
    for detail in outline.details:
        write(detail, 9.5, gray=True, gap=0.5)
    for section in outline.sections:
        pdf.ln(5)
        write(section.heading, 13, bold=True, gap=2)
        for item in section.items:
            if item.kind == "line":
                write(item.label, 9.5, bold=True, gray=True)
                write(item.text, 10.5, gap=2.5)
            elif item.kind == "bullet":
                write(f"•  {item.text}", 10.5, gap=1)
            elif item.kind == "task":
                write(f"{'☑' if item.done else '☐'}  {item.text}", 10.5, gap=1)
            else:
                write(item.text, 10.5, gap=2)
    return bytes(pdf.output())
