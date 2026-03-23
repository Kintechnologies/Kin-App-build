"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  UtensilsCrossed,
  Wallet,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 px-4 pb-2">
      <div className="flex items-center justify-around h-16 px-2 bg-surface/95 backdrop-blur-md rounded-2xl border border-warm-white/10 shadow-lg shadow-black/30">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary scale-110"
                  : "text-warm-white/40 hover:text-warm-white/60 active:scale-95"
              }`}
            >
              {isActive && (
                <div className="absolute -top-1 w-1 h-1 rounded-full bg-primary" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-mono">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
