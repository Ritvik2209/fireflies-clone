import { Check } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { formatTimestamp } from "@/lib/format";
import type { ActionItem, Participant } from "@/lib/types";

interface ActionItemsListProps {
  items: ActionItem[];
  people: Map<number, Participant>;
  onSeek: (ms: number) => void;
}

/** Action items grouped by assignee, as Fireflies shows them. Editing them arrives in Phase 5. */
export function ActionItemsList({ items, people, onSeek }: ActionItemsListProps) {
  return (
    <section className="mt-8">
      <h3 className="text-[15px] font-semibold text-gray-900">
        Action items <span className="font-normal text-gray-400">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No action items.</p>
      ) : (
        groupByAssignee(items, people).map((group) => (
          <div key={group.key} className="mt-4">
            <h4 className="flex items-center gap-2 text-sm text-gray-500">
              {group.person && (
                <Avatar name={group.person.name} color={group.person.avatar_color} size="sm" />
              )}
              {group.person?.name ?? "Unassigned"}
            </h4>
            <ul className="mt-2 space-y-2">
              {group.items.map((item) => (
                <ActionItemRow key={item.id} item={item} onSeek={onSeek} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function ActionItemRow({ item, onSeek }: { item: ActionItem; onSeek: (ms: number) => void }) {
  const startMs = item.source_start_ms;
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-1 flex size-4 shrink-0 items-center justify-center rounded border",
          item.is_completed
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-gray-300 bg-white",
        )}
      >
        {item.is_completed && <Check className="size-3" strokeWidth={3} aria-hidden />}
        <span className="sr-only">{item.is_completed ? "Done:" : "To do:"}</span>
      </span>
      <p
        className={cn(
          "text-[15px] leading-6",
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
  if (unassigned.length > 0)
    result.push({ key: "unassigned", person: undefined, items: unassigned });
  return result;
}
