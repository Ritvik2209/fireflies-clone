"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { isActive, type NavItem, PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/navigation";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-25 px-3 pb-4">
      <Link href="/meetings" className="flex h-[60px] items-center gap-2.5 px-2">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight text-gray-900">Glowworm</span>
      </Link>

      <nav aria-label="Main" className="mt-2 flex flex-1 flex-col">
        <NavList items={PRIMARY_NAV} pathname={pathname} />
        <div className="mt-auto border-t border-gray-200 pt-3">
          <NavList items={SECONDARY_NAV} pathname={pathname} />
        </div>
      </nav>
    </aside>
  );
}

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
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
