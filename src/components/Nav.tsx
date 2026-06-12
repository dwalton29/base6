"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const links = [
  ["/lounge", "Lounge"],
  ["/news", "News"],
  ["/social", "Social"],
  ["/passport", "Passport"],
  ["/crews", "Crews"],
  ["/sessions", "Sessions"],
  ["/events", "Events"],
];

type MiniProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  passport_number: string | null;
  platform: string | null;
  platform_handle: string | null;
  reputation_score: number | string | null;
};

type MenuItem = {
  href: string;
  label: string;
  icon: string;
};

const ACCOUNT_ITEMS: MenuItem[] = [
  { href: "/passport", label: "My Passport", icon: "📘" },
  { href: "/documents", label: "Documents", icon: "🎟️" },
  { href: "/reputation", label: "Reputation", icon: "⭐" },
  { href: "/crews", label: "My Crew", icon: "👥" },
];

const BASE6_ITEMS: MenuItem[] = [
  { href: "/sessions", label: "LFG / Sessions", icon: "📍" },
  { href: "/events", label: "Events", icon: "📅" },
  { href: "/social", label: "Social Feed", icon: "💬" },
  { href: "/news", label: "News", icon: "📰" },
  { href: "/lounge", label: "Lounge", icon: "🛫" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function initials(value: string | null | undefined) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "B6";
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "B6";
}

function displayName(profile: MiniProfile | null, fallback: string) {
  return profile?.username || profile?.platform_handle || fallback;
}

function fallbackProfileFromUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): MiniProfile | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const metaName = typeof meta.username === "string" ? meta.username : typeof meta.name === "string" ? meta.name : null;
  const emailName = user.email ? user.email.split("@")[0] : null;
  const avatar = typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null;

  return {
    id: user.id,
    username: metaName || emailName || "Passenger",
    avatar_url: avatar,
    passport_number: null,
    platform: null,
    platform_handle: null,
    reputation_score: 0,
  };
}

async function fetchProfile(uid: string): Promise<MiniProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, passport_number, platform, platform_handle, reputation_score")
    .eq("id", uid)
    .maybeSingle();

  if (error) return null;
  return (data as MiniProfile | null) || null;
}

function Avatar({ profile, loading, size = 24 }: { profile: MiniProfile | null; loading: boolean; size?: number }) {
  const src = typeof profile?.avatar_url === "string" ? profile.avatar_url.trim() : "";
  const label = initials(displayName(profile, "B6"));

  return (
    <span className="base6-avatar" style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.34)) }}>
      {loading ? "…" : src ? <img src={src} alt="" /> : label}
    </span>
  );
}

function MenuLink({ href, icon, label, onNav }: MenuItem & { onNav: () => void }) {
  return (
    <Link href={href} onClick={onNav} className="base6-menu-link">
      <span className="base6-menu-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function YouMenu({
  profile,
  loading,
  signedIn,
  onClose,
  onSignOut,
}: {
  profile: MiniProfile | null;
  loading: boolean;
  signedIn: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const name = loading ? "Loading…" : displayName(profile, signedIn ? "Passenger" : "Guest");
  const rep = Number(profile?.reputation_score ?? 0);
  const passportLabel = profile?.passport_number || (signedIn ? "Passport active" : "Check in for Leonida");

  return (
    <div className="base6-you-panel" role="dialog" aria-label="You menu">
      <div className="base6-menu-header">
        <Avatar profile={profile} loading={loading} size={42} />
        <div className="base6-menu-identity">
          <strong>{name}</strong>
          <span>{passportLabel}</span>
          {signedIn && profile?.platform ? <small>{profile.platform}{profile.platform_handle ? ` · ${profile.platform_handle}` : ""}</small> : null}
        </div>
        <button type="button" onClick={onClose} className="base6-menu-close" aria-label="Close menu">×</button>
      </div>

      <div className="base6-menu-body">
        {signedIn ? (
          <>
            <Link href="/reputation" onClick={onClose} className="base6-rep-card">
              <span>BASE6 reputation</span>
              <strong>{Number.isFinite(rep) ? rep.toLocaleString("en-GB") : "0"}</strong>
              <small>Stamps, trust notes and traveller history</small>
            </Link>

            <p className="base6-menu-section">Account</p>
            <div className="base6-menu-list">
              {ACCOUNT_ITEMS.map((item) => <MenuLink key={item.href} {...item} onNav={onClose} />)}
            </div>

            <p className="base6-menu-section">Base6</p>
            <div className="base6-menu-list is-two-col">
              {BASE6_ITEMS.map((item) => <MenuLink key={item.href} {...item} onNav={onClose} />)}
            </div>

            <button type="button" className="base6-signout" onClick={onSignOut}>
              <span aria-hidden="true">↩</span>
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <div className="base6-menu-list">
            <MenuLink href="/signup" label="Check in" icon="＋" onNav={onClose} />
            <MenuLink href="/login" label="Sign in" icon="↪" onNav={onClose} />
            <MenuLink href="/lounge" label="Lounge" icon="🛫" onNav={onClose} />
            <MenuLink href="/news" label="News" icon="📰" onNav={onClose} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MiniProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const youButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;

    async function sync() {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      if (!alive) return;
      setSignedIn(Boolean(user));

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const nextProfile = await fetchProfile(user.id);
      if (!alive) return;
      setProfile(nextProfile || fallbackProfileFromUser(user));
      setLoading(false);
    }

    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void sync());
    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handler = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (youButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  async function signOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    setSignedIn(false);
    setProfile(null);
    router.replace("/");
    router.refresh();
  }

  if (pathname === "/" || pathname === "/signup") return null;

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/lounge" aria-label="Base6 lounge">
            <span className="logo-mark">B6</span>
            <span>BASE6</span>
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            {links.map(([href, label]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
            <Link href="/signup" className="button primary">Board Flight</Link>
          </nav>
        </div>
      </header>

      <div className="base6-mobile-nav-wrap">
        {menuOpen ? (
          <div className="base6-you-layer" ref={menuRef}>
            <YouMenu
              profile={profile}
              loading={loading}
              signedIn={signedIn}
              onClose={() => setMenuOpen(false)}
              onSignOut={signOut}
            />
          </div>
        ) : null}

        <nav className="mobile-dock base6-mobile-dock" aria-label="Mobile navigation">
          <button
            ref={youButtonRef}
            type="button"
            className={`base6-mobile-tab${menuOpen ? " is-active" : ""}`}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Avatar profile={profile} loading={loading} size={24} />
            <span>You</span>
          </button>
          <Link className="base6-mobile-tab" href="/lounge"><span aria-hidden="true">🛫</span><span>Home</span></Link>
          <Link className="base6-mobile-tab" href="/social"><span aria-hidden="true">💬</span><span>Social</span></Link>
          <Link className="base6-mobile-tab" href="/passport"><span aria-hidden="true">📘</span><span>Passport</span></Link>
          <Link className="base6-mobile-tab" href="/sessions"><span aria-hidden="true">📍</span><span>LFG</span></Link>
        </nav>
      </div>

      <style jsx global>{`
        .base6-mobile-nav-wrap {
          display: none;
        }

        .base6-you-layer {
          position: fixed;
          left: 14px;
          right: 14px;
          bottom: calc(88px + env(safe-area-inset-bottom));
          z-index: 999;
          max-width: 372px;
          isolation: isolate;
        }

        .base6-you-layer::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(6, 3, 9, 0.1), rgba(6, 3, 9, 0.42));
        }

        .base6-you-panel {
          width: 100%;
          max-height: min(560px, calc(100vh - 122px - env(safe-area-inset-bottom)));
          border-radius: 24px;
          border: 1px solid rgba(210, 94, 255, 0.28);
          background: #12091a;
          background-image: linear-gradient(180deg, rgba(36, 19, 50, 0.98), rgba(12, 6, 18, 1));
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          backdrop-filter: blur(18px);
          overflow-y: auto;
          overflow-x: hidden;
          animation: base6MenuIn 180ms ease-out;
          color: #fff;
        }

        .base6-menu-header {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.055);
        }

        .base6-menu-identity {
          min-width: 0;
          flex: 1 1 auto;
          display: grid;
          gap: 2px;
        }

        .base6-menu-identity strong {
          color: #fff;
          font-size: 14px;
          font-weight: 1000;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .base6-menu-identity span,
        .base6-menu-identity small {
          color: rgba(255, 255, 255, 0.68);
          font-size: 11px;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .base6-menu-close {
          border: 0;
          border-radius: 999px;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.09);
          color: rgba(255, 255, 255, 0.76);
          font-size: 18px;
          font-weight: 900;
          line-height: 1;
        }

        .base6-menu-body {
          padding: 11px;
          display: grid;
          gap: 9px;
        }

        .base6-rep-card {
          text-decoration: none;
          display: grid;
          gap: 4px;
          border-radius: 18px;
          border: 1px solid rgba(210, 94, 255, 0.28);
          background: linear-gradient(135deg, rgba(179, 92, 255, 0.2), rgba(236, 67, 184, 0.08));
          color: #fff;
          padding: 12px;
        }

        .base6-rep-card span,
        .base6-rep-card small {
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          font-weight: 900;
        }

        .base6-rep-card strong {
          font-size: 24px;
          letter-spacing: -0.05em;
        }

        .base6-menu-section {
          margin: 5px 2px 0;
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .base6-menu-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 7px;
        }

        .base6-menu-list.is-two-col {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .base6-signout {
          width: 100%;
          min-height: 42px;
          border: 0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.07);
          color: #ffd0da;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 950;
          font-family: inherit;
        }

        .base6-avatar {
          flex: 0 0 auto;
          border-radius: 38%;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(135deg, rgba(179, 92, 255, 0.42), rgba(255, 255, 255, 0.08));
          color: rgba(255, 255, 255, 0.86);
          display: inline-grid;
          place-items: center;
          overflow: hidden;
          font-weight: 1000;
          line-height: 1;
        }

        .base6-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .base6-menu-link {
          min-width: 0;
          min-height: 42px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #fff;
          text-decoration: none;
          padding: 9px 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.1;
        }

        .base6-menu-link span:last-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .base6-menu-icon {
          flex: 0 0 auto;
          width: 19px;
          text-align: center;
        }

        .base6-mobile-dock {
          z-index: 900 !important;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          background: rgba(13, 10, 17, 0.96) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.56);
        }

        .base6-mobile-tab {
          min-width: 0;
          min-height: 50px;
          border: 0;
          border-radius: 16px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 900;
          line-height: 1;
          cursor: pointer;
          padding: 4px 3px;
          white-space: nowrap;
          font-family: inherit;
        }

        .base6-mobile-tab > span:first-child:not(.base6-avatar) {
          font-size: 18px;
          line-height: 1;
        }

        .base6-mobile-tab:hover,
        .base6-mobile-tab.is-active {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        @keyframes base6MenuIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 980px) {
          .base6-mobile-nav-wrap {
            display: block;
          }
        }

        @media (max-width: 390px) {
          .base6-menu-list.is-two-col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
