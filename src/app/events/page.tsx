"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string;
  event_type: string | null;
  description: string | null;
  starts_at: string | null;
  status: string | null;
  created_at: string;
  profiles?: { username: string } | null;
};

const fallbackEvents = [
  ["Airport lounge opening", "Pre-launch", "Introduce yourself, claim founding stamps and join crews."],
  ["Crew showcase night", "Community", "Crews pitch themselves with screenshots, clips and recruitment posts."],
  ["Leonida watch party", "Launch", "Countdown board, live chat and first-session matching."],
];

function formatWhen(value: string | null) {
  if (!value) return "Date TBC";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("community");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadEvents() {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Add Supabase env vars to load live events.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("community_events")
      .select("id, title, event_type, description, starts_at, status, created_at, profiles(username)")
      .order("starts_at", { ascending: true, nullsFirst: false });

    if (error) setMessage(error.message);
    setEvents((data as EventRow[] | null) || []);
    setIsLoading(false);
  }

  useEffect(() => { loadEvents(); }, []);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || isSaving) return;
    setMessage("");
    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in or log in before creating an event.");
      if (!title.trim()) throw new Error("Event title is required.");

      const { error } = await supabase.from("community_events").insert({
        host_id: user.id,
        title: title.trim(),
        event_type: eventType,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        description: description.trim() || null,
        status: "upcoming",
      });
      if (error) throw error;

      setTitle("");
      setDescription("");
      setStartsAt("");
      await loadEvents();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create event.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page stack">
      <PageHeader eyebrow="Events" title="Give people a reason to come back." copy="Events are now Supabase-backed. Use them for lounge nights, crew showcases, car meets and launch-week plans." />
      {message && <section className="muted-card copy">{message}</section>}

      <section className="grid grid-2">
        <form className="card stack" onSubmit={createEvent}>
          <span className="eyebrow">Events desk</span>
          <h2 className="h2">Schedule an event</h2>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" />
          <select className="input" value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="community">Community</option>
            <option value="crew">Crew showcase</option>
            <option value="car_meet">Car meet</option>
            <option value="watch_party">Watch party</option>
            <option value="launch">Launch</option>
          </select>
          <input className="input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What’s happening?" />
          <button className="button primary" type="submit" disabled={isSaving}>{isSaving ? "Scheduling..." : "Add to events board"}</button>
        </form>

        <div className="card stack">
          <span className="eyebrow">Leonida board</span>
          <h2 className="h2">Upcoming</h2>
          <div className="departure-board">
            <div className="board-row"><span>EVENT BOARD</span><strong>{isLoading ? "LOADING" : "LIVE"}</strong></div>
            <div className="board-row"><span>COUNTDOWN</span><strong>TBC</strong></div>
            <div className="board-row"><span>RSVPs</span><strong>NEXT</strong></div>
          </div>
        </div>
      </section>

      <section className="grid grid-3">
        {(events.length ? events : fallbackEvents as any[]).map((event: any) => (
          Array.isArray(event) ? (
            <article className="card stack" key={event[0]}><span className="eyebrow">{event[1]}</span><h2 className="h2">{event[0]}</h2><p className="copy">{event[2]}</p></article>
          ) : (
            <article className="card stack" key={event.id}>
              <span className="eyebrow">{event.event_type || "community"}</span>
              <h2 className="h2">{event.title}</h2>
              <p className="copy">{event.description || "No event notes yet."}</p>
              <div className="button-row"><span className="pill hot">{formatWhen(event.starts_at)}</span><span className="pill">{event.status || "upcoming"}</span></div>
              {event.profiles?.username && <p className="copy faint">Hosted by {event.profiles.username}</p>}
            </article>
          )
        ))}
      </section>
    </div>
  );
}
