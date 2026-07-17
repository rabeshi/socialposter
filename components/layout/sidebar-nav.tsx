"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Calendar,
  Sparkles,
  Palette,
  Plug,
  Timer,
  Settings,
  ChartNoAxesCombined,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/posts", label: "Post History", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/brand", label: "Brand", icon: Palette },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/automation", label: "Automation", icon: Timer },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-4 flex items-center gap-2 px-2 text-lg font-bold tracking-tight">
        <img src="/social-poster-logo.png" alt="" className="h-9 w-9 rounded-lg" />
        <span>Social Poster</span>
      </div>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
