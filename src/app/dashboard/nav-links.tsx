"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/listings", label: "Listings" },
  { href: "/dashboard/schedule", label: "Schedule" },
  { href: "/dashboard/contacts", label: "Contacts database" },
  { href: "/dashboard/emails", label: "Emails & newsletter" },
  { href: "/dashboard/appraisals", label: "Appraisals" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4">
      {LINKS.map((link) => {
        const active =
          link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`mb-0.5 block border-l-2 py-2.5 pl-3.5 text-[13.5px] transition-colors ${
              active
                ? "border-white font-semibold text-white"
                : "border-transparent text-[#a39c89] hover:border-white/30 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
