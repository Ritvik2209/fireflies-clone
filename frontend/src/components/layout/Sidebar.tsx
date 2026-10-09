"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NavDrawer } from "@/components/layout/NavDrawer";
import { isActive, type NavItem, PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

/**
 * The left edge from md up: a slim icon rail, like Fireflies, so the page keeps its width. Its
 * menu button opens the full sidebar (labels and logo) as a drawer. Phones have no rail; the top
 * bar's menu button opens the same drawer.
 */
export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // the full sidebar, as a drawer

  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center border-r border-gray-200 bg-gray-25 pb-4 md:flex">
      <div className="flex h-[60px] items-center">
        <IconButton
          icon={Menu}
          label="Open the sidebar"
          iconClassName="size-5"
          className="size-10"
          onClick={() => setOpen(true)}
        />
      </div>
      <nav aria-label="Main" className="mt-2 flex flex-1 flex-col items-center">
        <RailList items={PRIMARY_NAV} pathname={pathname} />
        <div className="mt-auto border-t border-gray-200 pt-3">
          <RailList items={SECONDARY_NAV} pathname={pathname} />
        </div>
      </nav>
      {open && <NavDrawer onClose={() => setOpen(false)} />}
    </aside>
  );
}

/** Icon-only links; the name is the accessible label and the tooltip. */
function RailList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-label={label}
              title={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
