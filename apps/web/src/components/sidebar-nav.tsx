"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart2, Radio, Newspaper,
  FileText, GitFork, TrendingUp, CalendarDays,
  MessageSquare, Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",                    label: "Dashboard",       icon: LayoutDashboard },
  { href: "/dashboard/analytics",          label: "Analytics",       icon: BarChart2 },
  { href: "/dashboard/sources",            label: "Sources",         icon: Radio },
  { href: "/dashboard/articles",           label: "Article Inbox",   icon: Newspaper },
  { href: "/dashboard/content",            label: "Content Review",  icon: FileText },
  { href: "/dashboard/clusters",           label: "Story Clusters",  icon: GitFork },
  { href: "/dashboard/trends",             label: "Macro Trends",    icon: TrendingUp },
  { href: "/dashboard/calendar",           label: "Calendar",        icon: CalendarDays },
  { href: "/dashboard/settings/feedback",  label: "AI Feedback",     icon: MessageSquare },
  { href: "/dashboard/settings",           label: "Settings",        icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-6 space-y-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-orange-500/10 text-orange-400 font-medium border border-orange-500/20"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
