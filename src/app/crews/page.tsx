"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { crews as demoCrews } from "@/components/DemoData";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type Crew = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  recruitment_status: string | null;
  reputation_score: number | null;
  created_at: string;
  profiles?: { username: string } | null;
  crew_members?: { count: number }[];
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || `crew-${Date.now()}`;
}

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [isSaving, setIsSaving] = useState(false);

  async function loadCrews() {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Add Supabase env vars to load real crews.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("crews")
      .select("id, name, slug, description, recruitment_status, reputation_score, created_at, profiles(username), crew_members(count)")
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    setCrews((data as Crew[] | null) || []);
    setIsLoading(false);
  }

  useEffect(() => { loadCrews(); }, []);

  async function createCrew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || isSaving) return;
    setMessage("");
    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in or log in before creating a crew.");
      if (!name.trim()) throw new Error("Crew name is required.");

      const baseSlug = slugify(name);
      const { error } = await supabase.from("crews").insert({
        owner_id: user.id,
        name: name.trim(),
        slug: `${baseSlug}-${Math.floor(Math.random() * 9999)}`,
        description: description.trim() || null,
        recruitment_status: status,
      });
      if (error) throw error;

      setName("");
      setDescription("");
      setStatus("open");
      await loadCrews();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create crew.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page stack">
      <PageHeader eyebrow="Crews" title="Build the community before launch." copy="Crews now read from Supabase. Create the first Leonida groups and let early members land together." />
      {message && <section className="muted-card copy">{message}</section>}

      <section className="grid grid-2">
        <form className="card stack" onSubmit={createCrew}>
          <span className="eyebrow">Crew desk</span>
          <h2 className="h2">Register a crew</h2>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Crew name" />
          <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What kind of crew is this? Car meets, chaos, roleplay, launch squad..." />
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="open">Recruiting</option>
            <option value="invite_only">Invite only</option>
            <option value="closed">Closed</option>
          </select>
          <button className="button primary" type="submit" disabled={isSaving}>{isSaving ? "Registering..." : "Open crew desk"}</button>
        </form>

        <div className="card stack">
          <span className="eyebrow">Crew terminal</span>
          <h2 className="h2">Live recruiting</h2>
          <p className="copy">These are stored in the new Supabase project. RLS only lets logged-in users create crews as themselves.</p>
          <div className="departure-board">
            <div className="board-row"><span>CREW BOARD</span><strong>{isLoading ? "LOADING" : "LIVE"}</strong></div>
            <div className="board-row"><span>RECRUITMENT</span><strong>OPEN</strong></div>
            <div className="board-row"><span>MEMBER JOINING</span><strong>NEXT</strong></div>
          </div>
        </div>
      </section>

      <section className="grid grid-3">
        {(crews.length ? crews : demoCrews as any[]).map((crew: any) => (
          <article className="card stack" key={crew.id || crew.name}>
            <span className="eyebrow">Rep {crew.reputation_score ?? crew.rep ?? 0}</span>
            <h2 className="h2">{crew.name}</h2>
            <p className="copy">{crew.description || crew.style}</p>
            <div className="button-row">
              <span className="pill">{crew.crew_members?.[0]?.count ?? crew.members ?? 0} members</span>
              <span className="pill hot">{crew.recruitment_status || "Recruiting"}</span>
            </div>
            {crew.profiles?.username && <p className="copy faint">Crew lead: {crew.profiles.username}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
