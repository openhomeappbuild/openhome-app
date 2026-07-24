"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/dashboard/listings", label: "Listings", icon: "🏠" },
  { href: "/dashboard/contacts", label: "Contacts database", icon: "👥" },
  { href: "/dashboard/emails", label: "Emails & newsletter", icon: "✉️" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-2.5">
      {LINKS.map((link) => {
        const active =
          link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] ${
              active ? "bg-[#111] font-semibold text-white" : "text-[#c6d2de] hover:bg-white/[0.06]"
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
