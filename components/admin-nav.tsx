"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Membership Console" },
  { href: "/admin/programs", label: "Program Schedule" },
  { href: "/admin/programs/library", label: "Program Library" },
  { href: "/admin/programs/exercises", label: "Internal Library" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-cyan-300 text-slate-950"
                : "border border-white/10 bg-white/5 text-stone-100 hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
