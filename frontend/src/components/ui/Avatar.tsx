import { cn } from "@/lib/cn";
import { initial } from "@/lib/format";
import type { AvatarColor } from "@/lib/types";

// Complete class names (not built from strings) so Tailwind can find them in the source.
const COLORS: Record<AvatarColor, string> = {
  indigo: "bg-avatar-indigo",
  green: "bg-avatar-green",
  yellow: "bg-avatar-yellow",
  orange: "bg-avatar-orange",
  pink: "bg-avatar-pink",
  cyan: "bg-avatar-cyan",
};

const SIZES = {
  sm: "size-5 text-[11px]",
  md: "size-8 text-sm",
  lg: "size-12 text-lg",
};

interface AvatarProps {
  name: string;
  color: AvatarColor;
  size?: keyof typeof SIZES;
}

/** Rounded-square initial avatar, the way Fireflies shows people and meetings. */
export function Avatar({ name, color, size = "md" }: AvatarProps) {
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white select-none",
        COLORS[color],
        SIZES[size],
      )}
    >
      {initial(name)}
    </span>
  );
}
