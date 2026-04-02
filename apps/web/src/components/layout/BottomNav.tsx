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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center justify-around h-[60px] px-3 max-w-lg mx-auto glass-strong rounded-[20px] shadow-xl shadow-black/40">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname !== null &&
            (pathname === href || (href !== "/dashboard" && pathname.startsWith(href)));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all duration-300 ${
                isActive
                  ? "text-primary"
                  : "text-warm-white/35 hover:text-warm-white/55 active:scale-90"
              }`}
            >
              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-primary" />
              )}
              <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 1.6} />
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? "text-primary" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
