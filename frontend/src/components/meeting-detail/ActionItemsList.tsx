"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type ActionItemDraft, ActionItemForm } from "@/components/meeting-detail/ActionItemForm";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { createActionItem, deleteActionItem, errorMessage, updateActionItem } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { ActionItem, Participant } from "@/lib/types";

interface ActionItemsListProps {
  meetingId: number;
  items: ActionItem[];
  people: Map<number, Participant>;
  onSeek: (ms: number) => void;
  /** Applies a change to the meeting's action items (a function of the current list). */
  onItemsChange: (update: (items: ActionItem[]) => ActionItem[]) => void;
}

/**
 * Action items grouped by assignee, as Fireflies shows them: tick, edit, delete and add.
 * Every change is saved through the API and confirmed with a toast. Ticking is optimistic.
 */
export function ActionItemsList({
  meetingId,
  items,
  people,
  onSeek,
  onItemsChange,
}: ActionItemsListProps) {
  // What's being edited: an item's id, "new" for the add form, or nothing.
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const assignees = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));

  function patchLocal(id: number, fields: Partial<ActionItem>) {
    onItemsChange((current) =>
      current.map((item) => (item.id === id ? { ...item, ...fields } : item)),
    );
  }

  async function toggle(item: ActionItem) {
    const done = !item.is_completed;
    patchLocal(item.id, { is_completed: done }); // tick straight away…
    try {
      const saved = await updateActionItem(item.id, { is_completed: done });
      patchLocal(item.id, saved);
      toast.success(done ? "Marked as done" : "Marked as not done");
    } catch (error) {
      patchLocal(item.id, { is_completed: !done }); // …and untick if saving failed
      toast.error(errorMessage(error));
    }
  }

  async function save(draft: ActionItemDraft, item?: ActionItem): Promise<boolean> {
    try {
      if (item) {
        const saved = await updateActionItem(item.id, {
          text: draft.text,
          assignee_id: draft.assigneeId,
        });
        patchLocal(item.id, saved);
        toast.success("Action item updated");
      } else {
        const created = await createActionItem(meetingId, {
          text: draft.text,
          assignee_id: draft.assigneeId,
        });
        onItemsChange((current) => [...current, created]);
        toast.success("Action item added");
      }
      setEditing(null);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false; // the form stays open with what the user typed
    }
  }

  async function remove(item: ActionItem) {
    try {
      await deleteActionItem(item.id);
      onItemsChange((current) => current.filter((existing) => existing.id !== item.id));
      toast.success("Action item deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">
          Action items <span className="font-normal text-gray-400">{items.length}</span>
        </h3>
        <Button
          variant="ghost"
          icon={Plus}
          onClick={() => setEditing("new")}
          disabled={editing === "new"} // the add form is already open
        >
          Add
        </Button>
      </div>
      {items.length === 0 && editing !== "new" && (
        <p className="mt-2 text-sm text-gray-500">No action items yet.</p>
      )}

      {groupByAssignee(items, people).map((group) => (
        <div key={group.key} className="mt-4">
          <h4 className="flex items-center gap-2 text-sm text-gray-500">
            {group.person && (
              <Avatar name={group.person.name} color={group.person.avatar_color} size="sm" />
            )}
            {group.person?.name ?? "Unassigned"}
          </h4>
          <ul className="mt-1.5 space-y-0.5">
            {group.items.map((item) =>
              editing === item.id ? (
                <li key={item.id}>
                  <ActionItemForm
                    initial={item}
                    assignees={assignees}
                    onSave={(draft) => save(draft, item)}
                    onCancel={() => setEditing(null)}
                  />
                </li>
              ) : (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  onSeek={onSeek}
                  onToggle={() => toggle(item)}
                  onEdit={() => setEditing(item.id)}
                  onDelete={() => remove(item)}
                />
              ),
            )}
          </ul>
        </div>
      ))}

      {editing === "new" && (
        <div className="mt-4">
          <ActionItemForm
            assignees={assignees}
            onSave={(draft) => save(draft)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
    </section>
  );
}

interface ActionItemRowProps {
  item: ActionItem;
  onSeek: (ms: number) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionItemRow({ item, onSeek, onToggle, onEdit, onDelete }: ActionItemRowProps) {
  const startMs = item.source_start_ms;
  return (
    <li className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={onToggle}
        aria-label={item.text}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-brand-600"
      />
      <p
        className={cn(
          "flex-1 text-[15px] leading-6",
          item.is_completed ? "text-gray-400 line-through" : "text-gray-700",
        )}
      >
        {item.text}
        {startMs !== null && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => onSeek(startMs)}
              aria-label={`Play from ${formatTimestamp(startMs)}`}
              className="text-link tabular-nums no-underline hover:underline"
            >
              {formatTimestamp(startMs)}
            </button>
          </>
        )}
      </p>
      {/* Edit and delete appear on hover or keyboard focus, so the list stays calm. */}
      <div className="flex shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton icon={Pencil} label="Edit action item" onClick={onEdit} className="size-7" />
        <IconButton
          icon={Trash2}
          label="Delete action item"
          onClick={onDelete}
          className="size-7"
        />
      </div>
    </li>
  );
}

interface AssigneeGroup {
  key: string;
  person: Participant | undefined; // undefined: nobody is assigned
  items: ActionItem[];
}

/** One group per assignee, in order of their first item; unassigned items come last. */
function groupByAssignee(items: ActionItem[], people: Map<number, Participant>): AssigneeGroup[] {
  const groups = new Map<string, AssigneeGroup>();
  const unassigned: ActionItem[] = [];
  for (const item of items) {
    const person = item.assignee_id === null ? undefined : people.get(item.assignee_id);
    if (!person) {
      unassigned.push(item);
      continue;
    }
    const key = String(person.id);
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { key, person, items: [item] });
  }
  const result = [...groups.values()];
  if (unassigned.length > 0) {
    result.push({ key: "unassigned", person: undefined, items: unassigned });
  }
  return result;
}
