"use client";

import { SendHorizontal, Trash2 } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { askQuestion, clearChat, errorMessage, listChat } from "@/lib/api";
import { cn } from "@/lib/cn";
import { parseTimestamp } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";

/** What a bubble needs; a question shown before the server stores it has no id yet. */
type Shown = Pick<ChatMessage, "role" | "content" | "answered_by">;

const TIMESTAMP = /(\d{1,2}:\d{2}(?::\d{2})?)/; // mm:ss or h:mm:ss
// Square brackets holding one or more timestamps: [04:05], [05:26–06:00] or [07:14, 13:35].
// The model is asked for one per bracket, but sometimes writes ranges and lists anyway.
const CITATION =
  /(\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*[-,\u2010-\u2015]\s*\d{1,2}:\d{2}(?::\d{2})?)*\])/;

const SUGGESTIONS = [
  "What was decided?",
  "What are the action items, and who owns them?",
  "What concerns came up?",
];

interface AskPanelProps {
  meetingId: number;
  onCite: (ms: number) => void; // a timestamp in an answer was clicked
}

/** The "Ask about this meeting" chat (bonus 6). Answers cite timestamps that seek the player. */
export function AskPanel({ meetingId, onCite }: AskPanelProps) {
  const [messages, setMessages] = useState<Shown[] | null>(null); // null while loading
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState<string | null>(null); // waiting for this answer
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    listChat(meetingId, controller.signal)
      .then(setMessages)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(errorMessage(error));
        setMessages([]);
      });
    return () => controller.abort();
  }, [meetingId]);

  // Keep the newest message in view (scrolling this box only, not the page).
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, asking]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || asking !== null) return;
    setAsking(trimmed);
    setQuestion("");
    try {
      const answer = await askQuestion(meetingId, trimmed);
      const asked: Shown = { role: "user", content: trimmed, answered_by: null };
      setMessages((current) => [...(current ?? []), asked, answer]);
    } catch (error) {
      toast.error(errorMessage(error)); // e.g. "Too many questions about this meeting: wait…"
      setQuestion(trimmed); // give the question back, to try again
    } finally {
      setAsking(null);
    }
  }

  async function clear() {
    try {
      await clearChat(meetingId);
      setMessages([]);
      toast.success("Chat cleared");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const empty = messages !== null && messages.length === 0 && asking === null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-6 py-4">
        {messages === null ? (
          <div className="space-y-3" aria-label="Loading the chat">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : empty ? (
          <div className="pt-6 text-center">
            <p className="text-sm text-gray-600">
              Ask anything about this meeting. Answers come from the transcript and link to the
              moments they cite.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {/* Append-only, so the position is a stable key. */}
            {messages.map((message, index) => (
              <Bubble key={index} message={message} onCite={onCite} />
            ))}
            {asking !== null && (
              <>
                <Bubble message={{ role: "user", content: asking, answered_by: null }} />
                <li className="text-sm text-gray-500" aria-live="polite">
                  Reading the transcript…
                </li>
              </>
            )}
          </ul>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-gray-200 p-4">
        <Input
          aria-label="Ask about this meeting"
          placeholder="Ask about this meeting"
          maxLength={500}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" icon={SendHorizontal} disabled={!question.trim() || asking !== null}>
          Ask
        </Button>
        {messages !== null && messages.length > 0 && (
          <Button
            variant="ghost"
            icon={Trash2}
            onClick={() => void clear()}
            aria-label="Clear chat"
          />
        )}
      </form>
    </div>
  );
}

function Bubble({ message, onCite }: { message: Shown; onCite?: (ms: number) => void }) {
  const mine = message.role === "user";
  return (
    <li className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-3.5 py-2 text-[15px] leading-6 whitespace-pre-line",
          mine
            ? "rounded-br-sm bg-brand-600 text-white"
            : "rounded-bl-sm bg-gray-100 text-gray-800",
        )}
      >
        {onCite && !mine ? withCitations(message.content, onCite) : message.content}
      </div>
      {message.answered_by === "fallback" && (
        <span className="mt-1 text-xs text-gray-400">
          From transcript search (AI answers aren&apos;t available right now)
        </span>
      )}
    </li>
  );
}

/**
 * The answer with every cited timestamp turned into a button that seeks there.
 * It's built from strings and elements, never HTML, so an answer can't inject markup.
 */
function withCitations(text: string, onCite: (ms: number) => void): ReactNode[] {
  // Splitting on a capturing group keeps the matches: they land at the odd positions.
  return text
    .split(CITATION)
    .flatMap((part, index) => (index % 2 === 1 ? citationButtons(part, index, onCite) : [part]));
}

/** "[05:26–06:00]" becomes "[", a button for 05:26, "–", a button for 06:00, and "]". */
function citationButtons(
  group: string,
  groupIndex: number,
  onCite: (ms: number) => void,
): ReactNode[] {
  return group.split(TIMESTAMP).map((part, index) => {
    const ms = index % 2 === 1 ? parseTimestamp(part) : null;
    if (ms === null) return part;
    return (
      <button
        key={`${groupIndex}-${index}`}
        type="button"
        onClick={() => onCite(ms)}
        className="font-medium text-link tabular-nums hover:underline"
      >
        {part}
      </button>
    );
  });
}
