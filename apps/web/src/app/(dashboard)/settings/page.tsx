"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Settings as SettingsIcon, Crown, Sparkles, LogOut, User, CreditCard, Gift, Sun, Moon, Monitor, Calendar, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface Profile {
  email: string;
  family_name: string | null;
  subscription_tier: string;
  trial_ends_at: string | null;
}

interface CalendarConnectionInfo {
  id: string;
  provider: "google" | "apple";
  sync_status: "idle" | "syncing" | "error";
  sync_error?: string;
  last_synced_at?: string;
  enabled: boolean;
}

const tierLabels: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: "Free Trial", color: "text-warm-white/60", bg: "bg-warm-white/10" },
  starter: { label: "Starter", color: "text-primary", bg: "bg-primary/15" },
  family: { label: "Family", color: "text-amber", bg: "bg-amber/15" },
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnectionInfo[]>([]);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [appleId, setAppleId] = useState("");
  const [applePassword, setApplePassword] = useState("");
  const [connectingApple, setConnectingApple] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("email, family_name, subscription_tier, trial_ends_at")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as Profile);

      // Load calendar connections
      const res = await fetch("/api/calendar/sync");
      if (res.ok) {
        const { connections } = await res.json();
        setCalendarConnections(connections || []);
      }
    }
    load();
  }, []);

  const googleConnected = calendarConnections.some((c) => c.provider === "google");
  const appleConnected = calendarConnections.some((c) => c.provider === "apple");

  async function connectGoogle() {
    setConnectingGoogle(true);
    try {
      const res = await fetch("/api/calendar/google");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setConnectingGoogle(false);
    }
  }

  async function disconnectCalendar(provider: "google" | "apple") {
    const endpoint = provider === "google" ? "/api/calendar/google" : "/api/calendar/apple/connect";
    await fetch(endpoint, { method: "DELETE" });
    setCalendarConnections((prev) => prev.filter((c) => c.provider !== provider));
  }

  async function connectApple() {
    if (!appleId || !applePassword) return;
    setConnectingApple(true);
    try {
      const res = await fetch("/api/calendar/apple/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId, appPassword: applePassword }),
      });
      if (res.ok) {
        setShowAppleModal(false);
        setAppleId("");
        setApplePassword("");
        // Reload connections
        const syncRes = await fetch("/api/calendar/sync");
        if (syncRes.ok) {
          const { connections } = await syncRes.json();
          setCalendarConnections(connections || []);
        }
      }
    } finally {
      setConnectingApple(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch("/api/calendar/sync", { method: "POST" });
      const res = await fetch("/api/calendar/sync");
      if (res.ok) {
        const { connections } = await res.json();
        setCalendarConnections(connections || []);
      }
    } finally {
      setSyncing(false);
    }
  }

  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  const tier = tierLabels[profile?.subscription_tier || "free"];
  const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const trialDaysLeft = trialActive
    ? Math.ceil((new Date(profile.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-2xl bg-warm-white/10 flex items-center justify-center">
          <SettingsIcon size={16} className="text-warm-white/60" />
        </div>
        <h1 className="font-serif italic text-2xl text-primary">Settings</h1>
      </div>
      <p className="text-warm-white/40 text-sm mb-8 ml-10">
        Manage your profile and subscription
      </p>

      <div className="space-y-4">
        {/* Profile card */}
        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-5 border border-warm-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-warm-white font-semibold text-sm">
                {profile?.family_name || "Your Family"}
              </p>
              <p className="text-warm-white/30 text-xs">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Subscription card */}
        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-5 border border-warm-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-2xl ${tier.bg} flex items-center justify-center`}>
              {profile?.subscription_tier === "family" ? (
                <Crown size={20} className={tier.color} />
              ) : (
                <Sparkles size={20} className={tier.color} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm ${tier.color}`}>{tier.label}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tier.bg} ${tier.color}`}>
                  {profile?.subscription_tier === "free" ? "Trial" : "Active"}
                </span>
              </div>
              {trialActive && (
                <p className="text-warm-white/30 text-xs">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in trial
                </p>
              )}
            </div>
          </div>

          {profile?.subscription_tier === "free" ? (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-primary text-background font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <CreditCard size={16} /> Upgrade Plan
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/pricing"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface text-warm-white/60 font-medium text-sm border border-warm-white/10 hover:border-warm-white/20 transition-all"
              >
                Change Plan
              </Link>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface text-warm-white/40 font-medium text-sm border border-warm-white/10 hover:border-rose/30 hover:text-rose transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-5 border border-warm-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-blue/15 flex items-center justify-center">
              {theme === "light" ? <Sun size={20} className="text-amber" /> :
               theme === "dark" ? <Moon size={20} className="text-blue" /> :
               <Monitor size={20} className="text-blue" />}
            </div>
            <div>
              <p className="text-warm-white font-semibold text-sm">Appearance</p>
              <p className="text-warm-white/30 text-xs">
                {theme === "system" ? "Follows your device" : theme === "light" ? "Light mode" : "Dark mode"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {([
              { value: "system" as const, label: "System", icon: Monitor },
              { value: "light" as const, label: "Light", icon: Sun },
              { value: "dark" as const, label: "Dark", icon: Moon },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
                  theme === value
                    ? "bg-primary text-background shadow-md shadow-primary/20"
                    : "bg-surface text-warm-white/40 border border-warm-white/10 hover:border-warm-white/20"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar connections */}
        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-5 border border-warm-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-blue/15 flex items-center justify-center">
              <Calendar size={20} className="text-blue" />
            </div>
            <div className="flex-1">
              <p className="text-warm-white font-semibold text-sm">Calendar Sync</p>
              <p className="text-warm-white/30 text-xs">
                {calendarConnections.length > 0
                  ? `${calendarConnections.length} calendar${calendarConnections.length > 1 ? "s" : ""} connected`
                  : "Connect your calendar for 2-way sync"}
              </p>
            </div>
            {calendarConnections.length > 0 && (
              <button
                onClick={triggerSync}
                disabled={syncing}
                className="p-2 rounded-xl bg-surface text-warm-white/40 hover:text-blue hover:bg-blue/10 border border-warm-white/10 transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          {/* Connection list */}
          {calendarConnections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-3 py-3 border-t border-warm-white/5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-warm-white/80 text-sm font-medium capitalize">
                    {conn.provider === "google" ? "Google Calendar" : "Apple Calendar"}
                  </span>
                  {conn.sync_status === "idle" && (
                    <CheckCircle2 size={12} className="text-primary" />
                  )}
                  {conn.sync_status === "syncing" && (
                    <Loader2 size={12} className="text-blue animate-spin" />
                  )}
                  {conn.sync_status === "error" && (
                    <AlertCircle size={12} className="text-rose" />
                  )}
                </div>
                {conn.last_synced_at && (
                  <p className="text-warm-white/25 text-[11px]">
                    Last synced {new Date(conn.last_synced_at).toLocaleString()}
                  </p>
                )}
                {conn.sync_error && (
                  <p className="text-rose/60 text-[11px]">{conn.sync_error}</p>
                )}
              </div>
              <button
                onClick={() => disconnectCalendar(conn.provider)}
                className="text-warm-white/20 text-xs hover:text-rose transition-colors"
              >
                Disconnect
              </button>
            </div>
          ))}

          {/* Connect buttons */}
          <div className="flex gap-2 mt-3">
            {!googleConnected && (
              <button
                onClick={connectGoogle}
                disabled={connectingGoogle}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface text-warm-white/60 font-medium text-sm border border-warm-white/10 hover:border-blue/30 hover:text-blue transition-all disabled:opacity-50"
              >
                {connectingGoogle ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </button>
            )}
            {!appleConnected && (
              <button
                onClick={() => setShowAppleModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface text-warm-white/60 font-medium text-sm border border-warm-white/10 hover:border-warm-white/30 hover:text-warm-white transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </button>
            )}
          </div>
        </div>

        {/* Apple Calendar Modal */}
        {showAppleModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-raised rounded-2xl p-6 max-w-sm w-full border border-warm-white/10">
              <h3 className="font-serif italic text-lg text-warm-white mb-1">Connect Apple Calendar</h3>
              <p className="text-warm-white/40 text-xs mb-4">
                Apple requires an app-specific password. Generate one at{" "}
                <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="text-blue underline">
                  appleid.apple.com
                </a>{" "}
                under Sign-In and Security → App-Specific Passwords.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-warm-white/50 text-xs block mb-1">Apple ID (email)</label>
                  <input
                    type="email"
                    value={appleId}
                    onChange={(e) => setAppleId(e.target.value)}
                    placeholder="you@icloud.com"
                    className="w-full bg-background border border-warm-white/10 rounded-xl px-3 py-2.5 text-sm text-warm-white placeholder:text-warm-white/20 focus:outline-none focus:border-blue/50"
                  />
                </div>
                <div>
                  <label className="text-warm-white/50 text-xs block mb-1">App-Specific Password</label>
                  <input
                    type="password"
                    value={applePassword}
                    onChange={(e) => setApplePassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full bg-background border border-warm-white/10 rounded-xl px-3 py-2.5 text-sm text-warm-white placeholder:text-warm-white/20 focus:outline-none focus:border-blue/50"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setShowAppleModal(false); setAppleId(""); setApplePassword(""); }}
                    className="flex-1 py-2.5 rounded-xl bg-surface text-warm-white/40 text-sm border border-warm-white/10 hover:border-warm-white/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={connectApple}
                    disabled={!appleId || !applePassword || connectingApple}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-background font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
                  >
                    {connectingApple ? "Connecting..." : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Referral card */}
        <Link
          href="/settings/referrals"
          className="block bg-gradient-to-br from-amber/10 to-surface-raised rounded-2xl p-5 border border-amber/10 hover:border-amber/20 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber/20 flex items-center justify-center">
              <Gift size={20} className="text-amber" />
            </div>
            <div className="flex-1">
              <p className="text-amber font-semibold text-sm">Refer a Family</p>
              <p className="text-warm-white/30 text-xs">Share Kin, earn free months</p>
            </div>
            <span className="text-warm-white/20 text-lg">→</span>
          </div>
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-surface-raised text-warm-white/40 font-medium text-sm hover:text-rose hover:bg-rose/10 border border-warm-white/5 hover:border-rose/20 transition-all"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
