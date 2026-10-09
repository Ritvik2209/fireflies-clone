import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { Participant, SortOrder, Tag } from "@/lib/types";

/** The library's filters (the title search lives in the top bar). Dates are local "YYYY-MM-DD". */
export interface LibraryFilters {
  participantId: string;
  tagId: string;
  from: string;
  to: string;
  sort: SortOrder;
}

interface MeetingFiltersProps {
  participants: Participant[];
  tags: Tag[];
  filters: LibraryFilters;
  onChange: (changes: Partial<LibraryFilters>) => void;
  canClear: boolean;
  onClear: () => void;
}

export function MeetingFilters({
  participants,
  tags,
  filters,
  onChange,
  canClear,
  onClear,
}: MeetingFiltersProps) {
  return (
    <div data-tour="filters" className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Filter by participant"
        className="w-44"
        value={filters.participantId}
        onChange={(event) => onChange({ participantId: event.target.value })}
      >
        <option value="">All participants</option>
        {participants.map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participant.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filter by tag"
        className="w-36"
        value={filters.tagId}
        onChange={(event) => onChange({ tagId: event.target.value })}
      >
        <option value="">All tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </Select>

      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Input
          type="date"
          aria-label="From date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(event) => onChange({ from: event.target.value })}
        />
        <span aria-hidden>–</span>
        <Input
          type="date"
          aria-label="To date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(event) => onChange({ to: event.target.value })}
        />
      </div>

      {canClear && (
        <Button variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      )}

      <Select
        aria-label="Sort meetings"
        className="ml-auto w-36"
        value={filters.sort}
        onChange={(event) => onChange({ sort: event.target.value as SortOrder })}
      >
        <option value="recent">Newest first</option>
        <option value="oldest">Oldest first</option>
      </Select>
    </div>
  );
}
