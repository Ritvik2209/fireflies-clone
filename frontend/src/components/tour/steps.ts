/** One stop on the intro tour. The overlay spotlights `target` and shows the card next to it. */
export interface TourStep {
  title: string;
  body: string;
  /** CSS selector of the feature to spotlight (a `data-tour` attribute); none = a centred card. */
  target?: string;
  /** Only the element whose text includes this, e.g. one meeting row among many. */
  targetText?: string;
  /** Where the step lives: the library, or the meeting the user opened during the tour. */
  page: "library" | "meeting";
  /** Narrow screens show the meeting's notes or transcript one at a time: show this one. */
  pane?: "notes" | "transcript";
  /** The user clicks the spotlighted feature to continue (it isn't blocked like the others). */
  clickToContinue?: boolean;
}

/** The seeded meeting with the most to show: notes, tags, highlights, comments and soundbites. */
export const TOUR_MEETING = "Discovery call: Coastline Facilities";

export const TOUR_STEPS: TourStep[] = [
  {
    page: "library",
    title: "Welcome to Glowworm",
    body: "A two-minute look at what this Fireflies-style meeting assistant can do. Skip it whenever you like.",
  },
  {
    page: "library",
    target: '[data-tour="day-group"]',
    title: "Your meetings",
    body: "Every meeting, grouped by day, with its time, length, participants and tags.",
  },
  {
    page: "library",
    target: '[data-tour="filters"]',
    title: "Filters",
    body: "Narrow the list by participant, tag or date range, and sort newest or oldest first. Filters live in the URL, so a filtered view can be shared.",
  },
  {
    page: "library",
    target: '[data-tour="search"]',
    title: "Search",
    body: "Type to filter meetings by title. Press Enter to search inside every transcript instead.",
  },
  {
    page: "library",
    target: '[data-tour="meeting-row"]',
    targetText: TOUR_MEETING,
    clickToContinue: true,
    title: "Open a meeting",
    body: `Click “${TOUR_MEETING}”. It has notes, highlights, comments and soundbites to show you.`,
  },
  {
    page: "meeting",
    pane: "notes",
    target: '[data-tour="ai-notes"]',
    title: "AI notes",
    body: "An overview and keywords for every meeting. The demo meetings have hand-written notes; uploads get notes written from their transcript.",
  },
  {
    page: "meeting",
    pane: "notes",
    target: '[data-tour="chapters"]',
    title: "Chapters",
    body: "The meeting split into topics. Click one to jump the player there.",
  },
  {
    page: "meeting",
    pane: "notes",
    target: '[data-tour="action-items"]',
    title: "Action items",
    body: "Who promised what, linked to the moment it was said. Tick them off, edit, reassign or add your own.",
  },
  {
    page: "meeting",
    pane: "notes",
    target: '[data-tour="talk-time"]',
    title: "Speaker talk time",
    body: "Who spoke how much and how fast, how many questions they asked, and their longest monologue.",
  },
  {
    page: "meeting",
    pane: "notes",
    target: '[data-tour="highlights"]',
    title: "Highlights, comments and soundbites",
    body: "Colour the lines that matter, discuss them in comment threads, and save soundbites: clips that play only their part of the meeting.",
  },
  {
    page: "meeting",
    pane: "transcript",
    target: '[data-tour="transcript"]',
    title: "Synced transcript",
    body: "Click any line to jump the player there. While it plays, the current line is highlighted and followed. Hover a line to highlight, comment on or clip it.",
  },
  {
    page: "meeting",
    pane: "transcript",
    target: '[data-tour="ask"]',
    title: "Ask about this meeting",
    body: "Ask questions in plain English. The AI (Groq) answers from the transcript and cites timestamps you can click.",
  },
  {
    page: "meeting",
    target: '[data-tour="player"]',
    title: "Player",
    body: "Play, pause, change speed and skip 15 seconds. The download button exports the transcript or the notes as TXT, Markdown or PDF.",
  },
  {
    page: "meeting",
    target: '[data-tour="new-meeting"]',
    title: "Add your own meetings",
    body: "Upload a .txt, .vtt or .json transcript, or paste one. It's processed in the background: it shows as Processing, then it's ready.",
  },
  {
    page: "meeting",
    target: '[data-tour="tour-button"]',
    title: "That's the tour",
    body: "Dark mode is the moon button next to this one. Take the tour again from here any time.",
  },
];
