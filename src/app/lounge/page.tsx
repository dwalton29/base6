"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { crews as demoCrews, feed as demoFeed, sessions as demoSessions, stamps as demoStamps } from "@/components/DemoData";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string;
  passport_number: string;
  platform: string | null;
  platform_handle: string | null;
  avatar_url: string | null;
  business_type: string | null;
  business_custom_text: string | null;
  reputation_score: number | null;
  created_at: string;
};

type StampJoin = { passport_stamps: { name: string; icon: string | null } | null };
type CrewRow = { id: string; name: string; description: string | null; recruitment_status: string | null; reputation_score: number | null; crew_members?: { count: number }[] };
type SessionRow = { id: string; title: string; session_type: string | null; platform: string | null; starts_at: string | null; max_players: number | null; status: string | null; profiles?: { username: string } | null };
type PostRow = { id: string; post_type: string | null; title: string | null; body: string | null; profiles?: { username: string } | null };

type LoungeState = {
  userProfile: Profile | null;
  stamps: string[];
  recentArrivals: Profile[];
  liveCrews: CrewRow[];
  liveSessions: SessionRow[];
  livePosts: PostRow[];
  counts: { profiles: number; crews: number; sessions: number; posts: number };
};

const emptyState: LoungeState = {
  userProfile: null,
  stamps: [],
  recentArrivals: [],
  liveCrews: [],
  liveSessions: [],
  livePosts: [],
  counts: { profiles: 0, crews: 0, sessions: 0, posts: 0 },
};

function formatWhen(value: string | null) {
  if (!value) return "Time TBC";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const GTA6_RELEASE_DATE = new Date("2026-11-19T00:00:00-05:00");

type ReleaseCountdown = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getReleaseCountdown(): ReleaseCountdown {
  const totalMs = Math.max(0, GTA6_RELEASE_DATE.getTime() - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { totalMs, days, hours, minutes, seconds };
}

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

export default function LoungePage() {
  const [state, setState] = useState<LoungeState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [releaseCountdown, setReleaseCountdown] = useState<ReleaseCountdown>(() => getReleaseCountdown());

  useEffect(() => {
    const timer = window.setInterval(() => setReleaseCountdown(getReleaseCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadLounge() {
      if (!hasSupabaseEnv || !supabase) {
        setMessage("Add Supabase env vars to show live lounge data.");
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        const [profilesRes, crewsRes, sessionsRes, postsRes] = await Promise.all([
          supabase.from("profiles").select("id, username, passport_number, platform, platform_handle, avatar_url, business_type, business_custom_text, reputation_score, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(6),
          supabase.from("crews").select("id, name, description, recruitment_status, reputation_score, crew_members(count)", { count: "exact" }).order("created_at", { ascending: false }).limit(3),
          supabase.from("sessions").select("id, title, session_type, platform, starts_at, max_players, status, profiles(username)", { count: "exact" }).order("created_at", { ascending: false }).limit(3),
          supabase.from("community_posts").select("id, post_type, title, body, profiles(username)", { count: "exact" }).order("created_at", { ascending: false }).limit(3),
        ]);

        let userProfile: Profile | null = null;
        let stamps: string[] = [];

        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username, passport_number, platform, platform_handle, avatar_url, business_type, business_custom_text, reputation_score, created_at")
            .eq("id", user.id)
            .maybeSingle();

          userProfile = (profileData as Profile | null) || null;

          const { data: stampData } = await supabase
            .from("user_passport_stamps")
            .select("passport_stamps(name, icon)")
            .eq("user_id", user.id);

          stamps = ((stampData as StampJoin[] | null) || []).map((row) => `${row.passport_stamps?.icon || "✦"} ${row.passport_stamps?.name || "Stamp"}`);
        }

        setState({
          userProfile,
          stamps,
          recentArrivals: (profilesRes.data as Profile[] | null) || [],
          liveCrews: (crewsRes.data as CrewRow[] | null) || [],
          liveSessions: (sessionsRes.data as SessionRow[] | null) || [],
          livePosts: (postsRes.data as PostRow[] | null) || [],
          counts: {
            profiles: profilesRes.count || 0,
            crews: crewsRes.count || 0,
            sessions: sessionsRes.count || 0,
            posts: postsRes.count || 0,
          },
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load live lounge data.");
      } finally {
        setIsLoading(false);
      }
    }

    loadLounge();
  }, []);

  const displayStamps = state.stamps.length ? state.stamps : demoStamps.slice(0, 4);
  const business = state.userProfile?.business_custom_text || state.userProfile?.business_type || "Leonida bound";

  const loungeCards = useMemo(() => [
    {
      eyebrow: "Flight B6-1119",
      title: `${releaseCountdown.days} days`,
      body: "Claim your passport, find your crew and wait in the lounge before the gates open.",
      href: "/events",
      cta: "View flight board",
    },
    {
      eyebrow: "Live arrivals",
      title: String(state.counts.profiles || state.recentArrivals.length || "—"),
      body: "Real passports checked in through Supabase. Early members get the best passport numbers.",
      href: "/passport",
      cta: "Open passport",
    },
    {
      eyebrow: "Crews recruiting",
      title: String(state.counts.crews || demoCrews.length),
      body: "Start recruiting before launch, set your crew style and build trust before everyone lands in Leonida.",
      href: "/crews",
      cta: "Browse crews",
    },
    {
      eyebrow: "Open sessions",
      title: String(state.counts.sessions || demoSessions.length),
      body: "Car meets, photo walks, heist planning, chill lobbies and launch week squads all in one board.",
      href: "/sessions",
      cta: "Find sessions",
    },
  ], [state.counts, state.recentArrivals.length, releaseCountdown.days]);

  return (
    <div className="page stack home-page">
      {message && <section className="muted-card copy">{message}</section>}

      <section className="live-departure-panel card">
        <div className="departure-topline">
          <div>
            <span className="eyebrow">Departure board</span>
            <h2 className="departure-title">Flight B6-1119 · Destination Leonida</h2>
          </div>
        </div>

        <div className="departure-marquee" aria-label="Flights to Leonida boarding soon">
          <div className="departure-marquee-track">
            <span>Flights to Leonida boarding soon</span>
            <span>Flights to Leonida boarding soon</span>
            <span>Flights to Leonida boarding soon</span>
            <span>Flights to Leonida boarding soon</span>
          </div>
        </div>

        <div className="countdown-grid" aria-label="Countdown to GTA 6 release date">
          <div className="countdown-cell"><strong>{releaseCountdown.days}</strong><span>Days</span></div>
          <div className="countdown-cell"><strong>{padTime(releaseCountdown.hours)}</strong><span>Hours</span></div>
          <div className="countdown-cell"><strong>{padTime(releaseCountdown.minutes)}</strong><span>Minutes</span></div>
          <div className="countdown-cell"><strong>{padTime(releaseCountdown.seconds)}</strong><span>Seconds</span></div>
        </div>

        <div className="flight-board-table">
          <div className="flight-board-row flight-board-head">
            <span>Flight</span>
            <span>Destination</span>
            <span>Gate</span>
            <span>Status</span>
          </div>
          <div className="flight-board-row active-flight">
            <span>B6-1119</span>
            <span>Leonida</span>
            <span>Passport Control</span>
            <span>Boarding soon</span>
          </div>
          <div className="flight-board-row">
            <span>B6-CREW</span>
            <span>Crew Terminal</span>
            <span>/crews</span>
            <span>{state.counts.crews || demoCrews.length} recruiting</span>
          </div>
          <div className="flight-board-row">
            <span>B6-LFG</span>
            <span>Session Lounge</span>
            <span>/sessions</span>
            <span>{state.counts.sessions || demoSessions.length} open</span>
          </div>
        </div>

        <div className="button-row departure-actions">
          <Link className="button primary" href={state.userProfile ? "/passport" : "/signup"}>
            {state.userProfile ? "Show boarding pass" : "Get your passport"}
          </Link>
          <Link className="button" href="/crews">Browse crews</Link>
        </div>
      </section>

      <section className="home-hero">
        <div className="hero-copy stack">
          <div className="button-row">
            <span className="pill hot">Unofficial GTA 6 community hub</span>
            <span className="pill">{isLoading ? "Loading lounge..." : "Pre-launch lounge open"}</span>
          </div>
          <div className="stack hero-title-wrap">
            <span className="eyebrow">BASE6 Passport Control</span>
            <h1 className="h1">{state.userProfile ? `Welcome to Leonida, ${state.userProfile.username}.` : "Check in before Leonida opens."}</h1>
            <p className="copy hero-lede">
              {state.userProfile
                ? `Passport ${state.userProfile.passport_number} is checked in. Business in Leonida: ${business}.`
                : "BASE6 is a GTA 6 community experience built around passports, stamps, crews, sessions, events and player reputation."}
            </p>
          </div>
          <div className="button-row">
            <Link className="button primary" href={state.userProfile ? "/passport" : "/signup"}>{state.userProfile ? "Open your passport" : "Start passport check-in"}</Link>
            <Link className="button" href="/sessions">Explore the lounge</Link>
          </div>
        </div>

        <aside className="card passport-card stack">
          <div className="passport-topline">
            <span className="eyebrow">Traveller file</span>
            <span className="status-dot">{state.userProfile ? "Checked in" : "Guest"}</span>
          </div>
          <div className="passport-id">
            <div className="avatar-stub">
              {state.userProfile?.avatar_url ? <img src={state.userProfile.avatar_url} alt="Passport ID" style={{ width: "100%", height: "100%", borderRadius: 18, objectFit: "cover" }} /> : "B6"}
            </div>
            <div>
              <p className="copy"><strong>{state.userProfile?.username || "Passenger pending"}</strong></p>
              <p className="copy faint">{state.userProfile?.passport_number || "Board flight to issue passport"}</p>
            </div>
          </div>
          <div className="passport-grid">
            <div><span className="metric-label">Stamps</span><strong>{state.stamps.length || displayStamps.length}</strong></div>
            <div><span className="metric-label">Platform</span><strong>{state.userProfile?.platform || "TBC"}</strong></div>
            <div><span className="metric-label">Rep</span><strong>{state.userProfile?.reputation_score ?? 0}</strong></div>
          </div>
          <div className="passport-stamps compact-stamps">
            {displayStamps.slice(0, 4).map((stamp) => <span key={stamp} className="stamp">{stamp}</span>)}
          </div>
        </aside>
      </section>

      <section className="lounge-strip">
        {loungeCards.map((item) => (
          <Link key={item.eyebrow} href={item.href} className="card lounge-card stack">
            <span className="eyebrow">{item.eyebrow}</span>
            <h2 className="h2">{item.title}</h2>
            <p className="copy">{item.body}</p>
            <span className="mini-link">{item.cta} →</span>
          </Link>
        ))}
      </section>

      <section className="home-dashboard">
        <div className="card board-card stack">
          <div className="section-title-row">
            <div><span className="eyebrow">Arrivals board</span><h2 className="h2">Recent passports</h2></div>
            <Link className="pill hot" href="/signup">Check in</Link>
          </div>
          <div className="departure-board">
            {(state.recentArrivals.length ? state.recentArrivals : []).map((profile) => (
              <div className="board-row" key={profile.id}><span>{profile.username}</span><strong>{profile.platform || "TBC"}</strong></div>
            ))}
            {!state.recentArrivals.length && ["PASSPORT CHECK-IN", "CREW TERMINAL", "COMMUNITY EVENTS"].map((row) => <div className="board-row" key={row}><span>{row}</span><strong>OPEN</strong></div>)}
          </div>
        </div>

        <div className="card stack">
          <div className="section-title-row">
            <div><span className="eyebrow">Recent sessions</span><h2 className="h2">Find your gate</h2></div>
            <Link className="pill" href="/sessions">View all</Link>
          </div>
          <div>
            {(state.liveSessions.length ? state.liveSessions : demoSessions).map((session: any) => (
              <div className="list-row" key={session.id || session.title}>
                <div>
                  <strong>{session.title}</strong>
                  <p className="copy faint">{session.session_type || session.type} · {session.platform || "All platforms"} · {session.starts_at ? formatWhen(session.starts_at) : session.when}</p>
                </div>
                <span className="pill hot">{session.status || session.slots || "Open"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card stack">
          <div className="section-title-row"><div><span className="eyebrow">Featured crews</span><h2 className="h2">People to land with</h2></div><Link className="pill" href="/crews">Crews</Link></div>
          {(state.liveCrews.length ? state.liveCrews : demoCrews).map((crew: any) => (
            <div className="muted-card" key={crew.id || crew.name}>
              <div className="button-row" style={{ justifyContent: "space-between" }}><strong>{crew.name}</strong><span className="pill">Rep {crew.reputation_score ?? crew.rep ?? 0}</span></div>
              <p className="copy faint">{crew.description || crew.style} · {crew.crew_members?.[0]?.count ?? crew.members ?? 0} members</p>
            </div>
          ))}
        </div>
        <div className="card stack">
          <div className="section-title-row"><div><span className="eyebrow">Community feed</span><h2 className="h2">Lounge chatter</h2></div><Link className="pill" href="/feed">Feed</Link></div>
          {(state.livePosts.length ? state.livePosts : demoFeed).map((post: any) => (
            <div className="muted-card" key={post.id || post.title}>
              <span className="pill hot">{post.post_type || post.tag}</span>
              <h3 className="h3" style={{ marginTop: 10 }}>{post.title}</h3>
              <p className="copy faint">{post.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
