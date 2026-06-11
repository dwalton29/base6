"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type RepEvent = {
  id: string;
  event_type: string;
  points: number;
  notes: string | null;
  created_at: string;
  target?: { username: string; passport_number: string | null } | null;
  actor?: { username: string } | null;
};

type ProfileOption = { id: string; username: string; passport_number: string | null; reputation_score: number | null };

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ReputationPage() {
  const [events, setEvents] = useState<RepEvent[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [eventType, setEventType] = useState("commendation");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadReputation() {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Add Supabase env vars to load live reputation data.");
      setIsLoading(false);
      return;
    }

    const [eventsRes, profilesRes] = await Promise.all([
      supabase
        .from("reputation_events")
        .select("id, event_type, points, notes, created_at, target:profiles!reputation_events_target_user_id_fkey(username, passport_number), actor:profiles!reputation_events_actor_user_id_fkey(username)")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("profiles")
        .select("id, username, passport_number, reputation_score")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (eventsRes.error) setMessage(eventsRes.error.message);
    if (profilesRes.error) setMessage(profilesRes.error.message);
    setEvents((eventsRes.data as RepEvent[] | null) || []);
    const profileRows = (profilesRes.data as ProfileOption[] | null) || [];
    setProfiles(profileRows);
    if (!targetUserId && profileRows[0]) setTargetUserId(profileRows[0].id);
    setIsLoading(false);
  }

  useEffect(() => { loadReputation(); }, []);

  async function addReputation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || isSaving) return;
    setMessage("");
    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in or log in before adding reputation.");
      if (!targetUserId) throw new Error("Choose a traveller first.");

      const points = eventType === "warning" ? -1 : eventType === "report" ? -3 : 1;
      const { error } = await supabase.from("reputation_events").insert({
        target_user_id: targetUserId,
        actor_user_id: user.id,
        event_type: eventType,
        points,
        notes: notes.trim() || null,
      });
      if (error) throw error;

      await supabase.rpc("increment_reputation", { profile_id: targetUserId, amount: points });
      setNotes("");
      await loadReputation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add reputation event.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page stack">
      <PageHeader eyebrow="Reputation" title="The hook that makes base6 useful." copy="Reputation is wired into Supabase as a visible travel record. This is still MVP-simple, but it now has real rows behind it." />
      {message && <section className="muted-card copy">{message}</section>}

      <section className="grid grid-3">
        <div className="card stack"><span className="eyebrow">Travellers</span><h2 className="h2">{profiles.length}</h2><p className="copy">Passports available for reputation actions.</p></div>
        <div className="card stack"><span className="eyebrow">Rep events</span><h2 className="h2">{events.length}</h2><p className="copy">Commendations, warnings and reports logged.</p></div>
        <div className="card stack"><span className="eyebrow">Status</span><h2 className="h2">{isLoading ? "Loading" : "Live"}</h2><p className="copy">Admin/mod controls come after this base layer.</p></div>
      </section>

      <section className="grid grid-2">
        <form className="card stack" onSubmit={addReputation}>
          <span className="eyebrow">Travel record desk</span>
          <h2 className="h2">Add reputation</h2>
          <select className="input" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.username} · {profile.passport_number}</option>)}
          </select>
          <select className="input" value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="commendation">Commendation +1</option>
            <option value="warning">Warning -1</option>
            <option value="report">Report -3</option>
          </select>
          <textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional context" />
          <button className="button primary" type="submit" disabled={isSaving || !profiles.length}>{isSaving ? "Recording..." : "Record travel note"}</button>
        </form>

        <div className="card stack">
          <span className="eyebrow">Top passports</span>
          <h2 className="h2">Clean records</h2>
          {profiles.slice(0, 6).map((profile) => (
            <div className="list-row" key={profile.id}>
              <div><strong>{profile.username}</strong><p className="copy faint">{profile.passport_number}</p></div>
              <span className="pill hot">Rep {profile.reputation_score ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-title-row"><div><span className="eyebrow">Audit trail</span><h2 className="h2">Recent reputation events</h2></div></div>
        {events.length ? events.map((item) => (
          <div className="list-row" key={item.id}>
            <div>
              <strong>{item.target?.username || "Traveller"} · {item.event_type}</strong>
              <p className="copy faint">{item.points > 0 ? "+" : ""}{item.points} points · by {item.actor?.username || "system"} · {formatWhen(item.created_at)}</p>
              {item.notes && <p className="copy">{item.notes}</p>}
            </div>
            <span className="pill">{item.target?.passport_number || "B6"}</span>
          </div>
        )) : <p className="copy">No reputation events yet.</p>}
      </section>
    </div>
  );
}
