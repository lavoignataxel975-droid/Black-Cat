"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string; match?: string[] }[] }) {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Navigation principale">
      {links.map((l) => {
        const active =
          l.href === "/"
            ? pathname === "/"
            : (l.match ?? [l.href]).some((m) => pathname === m || pathname.startsWith(`${m}/`));
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
