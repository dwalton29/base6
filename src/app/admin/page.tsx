"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type Stats = { profiles: number; crews: number; sessions: number; posts: number; events: number; reputation: number };
type Profile = { id: string; username: string; passport_number: string; platform: string | null; created_at: string };

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({ profiles: 0, crews: 0, sessions: 0, posts: 0, events: 0, reputation: 0 });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAdmin() {
      if (!hasSupabaseEnv || !supabase) {
        setMessage("Add Supabase env vars to load admin stats.");
        setIsLoading(false);
        return;
      }

      const [profilesRes, crewsRes, sessionsRes, postsRes, eventsRes, repRes] = await Promise.all([
        supabase.from("profiles").select("id, username, passport_number, platform, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(10),
        supabase.from("crews").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id", { count: "exact", head: true }),
        supabase.from("community_posts").select("id", { count: "exact", head: true }),
        supabase.from("community_events").select("id", { count: "exact", head: true }),
        supabase.from("reputation_events").select("id", { count: "exact", head: true }),
      ]);

      const firstError = [profilesRes.error, crewsRes.error, sessionsRes.error, postsRes.error, eventsRes.error, repRes.error].find(Boolean);
      if (firstError) setMessage(firstError.message);

      setStats({
        profiles: profilesRes.count || 0,
        crews: crewsRes.count || 0,
        sessions: sessionsRes.count || 0,
        posts: postsRes.count || 0,
        events: eventsRes.count || 0,
        reputation: repRes.count || 0,
      });
      setProfiles((profilesRes.data as Profile[] | null) || []);
      setIsLoading(false);
    }

    loadAdmin();
  }, []);

  return (
    <div className="page stack">
      <PageHeader eyebrow="Mod HQ" title="Admin shell connected." copy="This is not permission-locked yet. It gives you live Supabase counts while the MVP is still local/dev." />
      {message && <section className="muted-card copy">{message}</section>}

      <section className="grid grid-3">
        <div className="card stack"><span className="eyebrow">Passports</span><h2 className="h2">{isLoading ? "—" : stats.profiles}</h2><p className="copy">Users checked in.</p></div>
        <div className="card stack"><span className="eyebrow">Crews</span><h2 className="h2">{isLoading ? "—" : stats.crews}</h2><p className="copy">Registered crews.</p></div>
        <div className="card stack"><span className="eyebrow">Sessions</span><h2 className="h2">{isLoading ? "—" : stats.sessions}</h2><p className="copy">LFG/departure posts.</p></div>
        <div className="card stack"><span className="eyebrow">Feed posts</span><h2 className="h2">{isLoading ? "—" : stats.posts}</h2><p className="copy">Community updates.</p></div>
        <div className="card stack"><span className="eyebrow">Events</span><h2 className="h2">{isLoading ? "—" : stats.events}</h2><p className="copy">Scheduled lounge events.</p></div>
        <div className="card stack"><span className="eyebrow">Rep events</span><h2 className="h2">{isLoading ? "—" : stats.reputation}</h2><p className="copy">Travel record actions.</p></div>
      </section>

      <section className="card stack">
        <div className="section-title-row"><div><span className="eyebrow">Recent arrivals</span><h2 className="h2">Newest passports</h2></div></div>
        {profiles.length ? profiles.map((profile) => (
          <div className="list-row" key={profile.id}>
            <div><strong>{profile.username}</strong><p className="copy faint">{profile.passport_number} · {profile.platform || "Platform TBC"}</p></div>
            <span className="pill">{formatWhen(profile.created_at)}</span>
          </div>
        )) : <p className="copy">No passports yet.</p>}
      </section>

      <section className="grid grid-3">
        {['Reports queue', 'Crew review', 'Stamp grants', 'User actions', 'Event editor', 'Reputation audit'].map((item) => <div className="card" key={item}>{item}</div>)}
      </section>
    </div>
  );
}
