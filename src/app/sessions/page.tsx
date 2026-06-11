"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { sessions as demoSessions } from "@/components/DemoData";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type Session = {
  id: string;
  title: string;
  session_type: string | null;
  platform: string | null;
  starts_at: string | null;
  max_players: number | null;
  description: string | null;
  status: string | null;
  created_at: string;
  profiles?: { username: string } | null;
};

function formatWhen(value: string | null) {
  if (!value) return "Time TBC";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("looking_for_crew");
  const [platform, setPlatform] = useState("Any platform");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [isSaving, setIsSaving] = useState(false);

  async function loadSessions() {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Add Supabase env vars to load live sessions.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("id, title, session_type, platform, starts_at, max_players, description, status, created_at, profiles(username)")
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    setSessions((data as Session[] | null) || []);
    setIsLoading(false);
  }

  useEffect(() => { loadSessions(); }, []);

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || isSaving) return;
    setMessage("");
    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in or log in before posting a session.");
      if (!title.trim()) throw new Error("Session title is required.");

      const { error } = await supabase.from("sessions").insert({
        host_id: user.id,
        title: title.trim(),
        session_type: type,
        platform,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        max_players: Number(maxPlayers) || null,
        description: description.trim() || null,
        status: "open",
      });
      if (error) throw error;

      setTitle("");
      setDescription("");
      setStartsAt("");
      await loadSessions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create session.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page stack">
      <PageHeader eyebrow="LFG / Sessions" title="A clean board for finding players." copy="Sessions now save to Supabase. This becomes the departures board: crews, car meets, launch squads and chill lobbies." />
      {message && <section className="muted-card copy">{message}</section>}

      <section className="grid grid-2">
        <form className="card stack" onSubmit={createSession}>
          <span className="eyebrow">Departure desk</span>
          <h2 className="h2">Post a session</h2>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Looking for launch crew" />
          <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="vacation">Vacation / chill</option>
            <option value="car_meet">Car meet</option>
            <option value="looking_for_crew">Looking for a crew</option>
            <option value="event">Event</option>
            <option value="other">Other</option>
          </select>
          <select className="input" value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option>Any platform</option>
            <option>PlayStation 5</option>
            <option>Xbox Series X|S</option>
            <option>Steam / PC</option>
          </select>
          <input className="input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          <input className="input" type="number" min="1" max="64" value={maxPlayers} onChange={(event) => setMaxPlayers(event.target.value)} placeholder="Max players" />
          <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you looking for?" />
          <button className="button primary" type="submit" disabled={isSaving}>{isSaving ? "Posting..." : "Add to board"}</button>
        </form>

        <div className="card stack">
          <span className="eyebrow">Flight board</span>
          <h2 className="h2">Open sessions</h2>
          <div className="departure-board">
            <div className="board-row"><span>SESSION BOARD</span><strong>{isLoading ? "LOADING" : "LIVE"}</strong></div>
            <div className="board-row"><span>POSTING</span><strong>AUTHED</strong></div>
            <div className="board-row"><span>JOIN REQUESTS</span><strong>NEXT</strong></div>
          </div>
        </div>
      </section>

      <section className="card stack">
        {(sessions.length ? sessions : demoSessions as any[]).map((session: any) => (
          <div className="list-row" key={session.id || session.title}>
            <div>
              <strong>{session.title}</strong>
              <p className="copy faint">{session.session_type || session.type} · {session.platform || "All platforms"} · {session.starts_at ? formatWhen(session.starts_at) : session.when}</p>
              {session.description && <p className="copy">{session.description}</p>}
              {session.profiles?.username && <p className="copy faint">Hosted by {session.profiles.username}</p>}
            </div>
            <span className="pill hot">{session.max_players ? `${session.max_players} max` : session.slots || "Open"}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
