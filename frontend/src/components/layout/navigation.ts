import type { LucideIcon } from "lucide-react";
import { Layers, Mic, Settings, Users, Video } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Main sidebar links. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/team", label: "Team", icon: Users },
];

/** Links pinned to the bottom of the sidebar. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/integrations", label: "Integrations", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** True for the link's own page and anything below it ("/meetings/12" is inside "/meetings"). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Title of the current section, shown in the top bar. */
export function sectionTitle(pathname: string): string {
  const item = [...PRIMARY_NAV, ...SECONDARY_NAV].find(({ href }) => isActive(pathname, href));
  return item?.label ?? "";
}
