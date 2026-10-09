"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Logo } from "@/components/layout/Logo";
import { isActive, type NavItem, PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

/**
 * The full sidebar (logo and labelled links) as a drawer over the page. It opens from the icon
 * rail's menu button (md and up) or the top bar's (phones), and closes on Escape, a click outside
 * or a chosen link.
 */
export function NavDrawer({ onClose }: { onClose: () => void }) {
  // Escape closes it, like the dialogs.
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      {/* The dimmed page behind the drawer: clicking it closes the drawer. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside className="relative flex h-full w-64 max-w-[80%] flex-col bg-gray-25 px-3 pb-4 shadow-xl">
        <IconButton
          icon={X}
          label="Close menu"
          onClick={onClose}
          className="absolute top-3 right-2 size-9"
        />
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

/** The logo and the labelled navigation: the drawer's content. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <Link
        href="/meetings"
        onClick={onNavigate}
        className="flex h-[60px] items-center gap-2.5 px-2"
      >
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight text-gray-900">Glowworm</span>
      </Link>

      <nav aria-label="Menu" className="mt-2 flex flex-1 flex-col">
        <NavList items={PRIMARY_NAV} pathname={pathname} onNavigate={onNavigate} />
        <div className="mt-auto border-t border-gray-200 pt-3">
          <NavList items={SECONDARY_NAV} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </nav>
    </>
  );
}

interface NavListProps {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void; // the drawer closes when a link is chosen
}

function NavList({ items, pathname, onNavigate }: NavListProps) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors",
                active
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon
                className={cn("size-[18px]", active ? "text-gray-700" : "text-gray-500")}
                aria-hidden
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
