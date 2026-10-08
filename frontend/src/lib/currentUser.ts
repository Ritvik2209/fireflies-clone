import type { AvatarColor } from "@/lib/types";

/** The default logged-in user (real authentication is out of scope). Matches the seeded user. */
export const CURRENT_USER: { name: string; email: string; avatarColor: AvatarColor } = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  avatarColor: "indigo",
};
