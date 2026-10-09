"use client";

import { Pencil, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { addComment, deleteComment, errorMessage, listComments, updateComment } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import type { Comment } from "@/lib/types";

interface CommentThreadProps {
  segmentId: number;
  onCountChange: (segmentId: number, count: number) => void;
}

/** The comments on one transcript line, opened under it: read, add, edit and delete. */
export function CommentThread({ segmentId, onCountChange }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[] | null>(null); // null while loading
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listComments(segmentId, controller.signal)
      .then(setComments)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(errorMessage(error));
        setComments([]);
      });
    return () => controller.abort();
  }, [segmentId]);

  function show(next: Comment[]) {
    setComments(next);
    onCountChange(segmentId, next.length);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function add(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !comments) return;
    void run(async () => {
      const comment = await addComment(segmentId, draft.trim());
      show([...comments, comment]);
      setDraft("");
      toast.success("Comment added");
    });
  }

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.text.trim() || !comments) return;
    void run(async () => {
      const saved = await updateComment(editing.id, editing.text.trim());
      show(comments.map((comment) => (comment.id === saved.id ? saved : comment)));
      setEditing(null);
      toast.success("Comment updated");
    });
  }

  function remove(target: Comment) {
    if (!comments) return;
    void run(async () => {
      await deleteComment(target.id);
      show(comments.filter((comment) => comment.id !== target.id));
      toast.success("Comment deleted");
    });
  }

  return (
    // Clicks in here mustn't reach the line, which would seek the player.
    <div
      onClick={(event) => event.stopPropagation()}
      className="mt-3 ml-8 cursor-auto rounded-lg border border-gray-200 bg-surface p-3"
    >
      {comments === null ? (
        <p className="text-sm text-gray-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="group/comment text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{comment.author_name}</span>
                <span className="text-xs text-gray-400">{formatShortDate(comment.created_at)}</span>
                <div className="ml-auto flex opacity-0 transition-opacity group-focus-within/comment:opacity-100 group-hover/comment:opacity-100">
                  <IconButton
                    icon={Pencil}
                    label="Edit comment"
                    className="size-6"
                    onClick={() => setEditing({ id: comment.id, text: comment.text })}
                  />
                  <IconButton
                    icon={Trash2}
                    label="Delete comment"
                    className="size-6"
                    disabled={busy}
                    onClick={() => remove(comment)}
                  />
                </div>
              </div>
              {editing?.id === comment.id ? (
                <form onSubmit={saveEdit} className="mt-1 flex gap-2">
                  <Input
                    autoFocus
                    aria-label="Edit comment"
                    maxLength={1000}
                    value={editing.text}
                    onChange={(event) => setEditing({ ...editing, text: event.target.value })}
                    onKeyDown={(event) => event.key === "Escape" && setEditing(null)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={busy || !editing.text.trim()}>
                    Save
                  </Button>
                </form>
              ) : (
                <p className="mt-0.5 whitespace-pre-line text-gray-700">{comment.text}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-3 flex gap-2">
        <Input
          aria-label="Add a comment"
          placeholder="Add a comment"
          maxLength={1000}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={busy || !draft.trim() || comments === null}>
          Comment
        </Button>
      </form>
    </div>
  );
}
