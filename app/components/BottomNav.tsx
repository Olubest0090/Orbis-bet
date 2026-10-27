"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, string> = {
  home: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  me: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9a8 8 0 0 1 16 0",
  shares: "M4 20V10m6 10V4m6 16v-7m5 7H3",
  out: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11",
};

const TABS: [string, string, string][] = [
  ["/", "Home", "home"],
  ["/me", "Me", "me"],
  ["/me/shares", "Shares", "shares"],
  ["/api/auth/logout", "Log out", "out"],
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/me")
    return pathname === "/me" || (pathname.startsWith("/me/") && !pathname.startsWith("/me/shares"));
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-14 border-t border-[var(--border)] bg-[rgba(8,12,30,0.9)] backdrop-blur">
      {TABS.map(([href, label, icon]) => {
        const on = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            prefetch={href === "/api/auth/logout" ? false : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] ${
              on ? "text-[var(--green)]" : "text-[var(--muted)]"
            }`}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={ICONS[icon]} />
            </svg>
            <span className={on ? "font-semibold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
