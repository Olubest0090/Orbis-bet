"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: [string, string][] = [
  ["/", "Home"],
  ["/me", "Me"],
  ["/me/shares", "Shares"],
  ["/api/auth/logout", "Log out"],
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/me") return pathname === "/me" || (pathname.startsWith("/me/") && !pathname.startsWith("/me/shares"));
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-[var(--border)] bg-[var(--card)] text-xs">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          prefetch={href === "/api/auth/logout" ? false : undefined}
          className={`flex-1 py-3 text-center ${
            isActive(pathname, href) ? "font-semibold text-[var(--green)]" : "text-[var(--muted)]"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
