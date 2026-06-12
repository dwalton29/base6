"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { crews as demoCrews } from "@/components/DemoData";
import CrewActionCard from "@/components/crews/CrewActionCard";
import {
  PLAY_STYLE_OPTIONS,
  THEME_OPTIONS,
  asPlayStyles,
  eraLabel,
  getSupabaseErrorMessage,
  initials,
  slugify,
  statusLabel,
  type Crew,
  type CrewEra,
  type JoinPolicy,
  type Membership,
} from "@/lib/crews";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type CrewPanel = "create" | "search" | null;

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<CrewPanel>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [status, setStatus] = useState<JoinPolicy>("open");
  const [gameScope, setGameScope] = useState<CrewEra>("GTA_VI");
  const [crewColor, setCrewColor] = useState("#b35cff");
  const [crewTheme, setCrewTheme] = useState("midnight");
  const [playStyles, setPlayStyles] = useState<string[]>(["Heists", "Missions"]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.status === "active" || membership.status === "pending") || null,
    [memberships]
  );

  const liveCrews = crews.length ? crews : (demoCrews as unknown as Crew[]);
  const currentCrew = useMemo(
    () => activeMembership ? liveCrews.find((crew) => crew.id === activeMembership.crew_id) || null : null,
    [activeMembership, liveCrews]
  );
  const isOwner = Boolean(currentUserId && currentCrew?.owner_id === currentUserId) || activeMembership?.role === "owner";
  const isPending = activeMembership?.status === "pending";
  const crewActionImages = useMemo(() => liveCrews.map((crew) => crew.photo_url).filter((url): url is string => Boolean(url)), [liveCrews]);
  const createCardImage = currentCrew?.photo_url || crewActionImages[0] || null;
  const searchCardImage = crewActionImages.find((url) => url !== createCardImage) || crewActionImages[0] || null;

  const filteredCrews = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return liveCrews;
    return liveCrews.filter((crew) => {
      const styles = asPlayStyles(crew.play_styles).join(" ").toLowerCase();
      return [crew.name, crew.bio, crew.description, crew.owner_username, eraLabel(crew.game_scope), statusLabel(crew.recruitment_status), styles]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [liveCrews, searchTerm]);

  async function loadCrews() {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Demo crews loaded. Add Supabase env vars and run the crew SQL for the live system.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;
    setCurrentUserId(userId);

    if (userId) {
      const { data: membershipData, error: membershipError } = await supabase
        .from("crew_members")
        .select("crew_id, profile_id, user_id, role, status")
        .or(`profile_id.eq.${userId},user_id.eq.${userId}`)
        .in("status", ["active", "pending"]);
      if (membershipError) setMessage(getSupabaseErrorMessage(membershipError, "Could not load crew membership."));
      setMemberships((membershipData as Membership[] | null) || []);
    } else {
      setMemberships([]);
    }

    const { data, error } = await supabase
      .from("crews")
      .select("id, owner_id, name, slug, bio, description, photo_url, crew_color, crew_theme, game_scope, play_styles, recruitment_status, reputation_score, created_at, crew_members(count)")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not load crews."));
      setCrews([]);
      setIsLoading(false);
      return;
    }

    const baseCrews = (data as Crew[] | null) || [];
    const ownerIds = Array.from(new Set(baseCrews.map((crew) => crew.owner_id).filter((id): id is string => Boolean(id))));
    let ownerMap = new Map<string, string | null>();

    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ownerIds);
      ownerMap = new Map(((owners as { id: string; username: string | null }[] | null) || []).map((owner) => [owner.id, owner.username]));
    }

    setCrews(baseCrews.map((crew) => ({ ...crew, owner_username: crew.owner_id ? ownerMap.get(crew.owner_id) || null : null })));
    setIsLoading(false);
  }

  useEffect(() => { void loadCrews(); }, []);

  function togglePlayStyle(style: string) {
    setPlayStyles((current) => current.includes(style) ? current.filter((item) => item !== style) : [...current, style]);
  }

  async function awardStamp(stampCode: string) {
    if (!hasSupabaseEnv || !supabase || !currentUserId) return;
    const { data: existing } = await supabase
      .from("user_passport_stamps")
      .select("stamp_code")
      .eq("user_id", currentUserId)
      .eq("stamp_code", stampCode)
      .maybeSingle();
    if (!existing) await supabase.from("user_passport_stamps").insert({ user_id: currentUserId, stamp_code: stampCode });
  }

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
      if (activeMembership) throw new Error("You are already on a crew manifest. Leave your current crew before registering another.");

      const baseSlug = slugify(name);
      const uniqueSuffix = Math.floor(1000 + Math.random() * 8999);
      const { data, error } = await supabase
        .from("crews")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          slug: `${baseSlug}-${uniqueSuffix}`,
          bio: bio.trim() || null,
          description: bio.trim() || null,
          photo_url: photoUrl.trim() || null,
          recruitment_status: status,
          game_scope: gameScope,
          play_styles: playStyles,
          crew_color: crewColor,
          crew_theme: crewTheme,
        })
        .select("id, slug")
        .single();
      if (error) throw error;

      await awardStamp("crew_founder");
      setName("");
      setBio("");
      setPhotoUrl("");
      setStatus("open");
      setPlayStyles(["Heists", "Missions"]);
      await loadCrews();
      setMessage("Crew registered. Your manifest is open.");
      if (data?.slug) window.location.href = `/crews/${data.slug}`;
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not create crew."));
    } finally {
      setIsSaving(false);
    }
  }

  async function joinCrew(crew: Crew) {
    if (!hasSupabaseEnv || !supabase) return;
    setMessage("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in or log in before joining a crew.");
      if (activeMembership) throw new Error("You can only be on one crew manifest at a time.");
      if (crew.recruitment_status === "closed" || crew.recruitment_status === "invite_only") throw new Error("This crew is not taking open boardings right now.");

      const nextStatus = crew.recruitment_status === "request" ? "pending" : "active";
      const { error } = await supabase.from("crew_members").insert({
        crew_id: crew.id,
        profile_id: user.id,
        user_id: user.id,
        role: "member",
        status: nextStatus,
      });
      if (error) throw error;
      if (nextStatus === "active") await awardStamp("crew_member");
      await loadCrews();
      setMessage(nextStatus === "pending" ? "Join request sent to crew command." : `You joined ${crew.name}.`);
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not join crew."));
    }
  }

  async function leaveCrew() {
    if (!hasSupabaseEnv || !supabase || !activeMembership || isLeaving) return;
    const confirmed = window.confirm(isPending ? "Cancel this crew request?" : "Leave your current crew?");
    if (!confirmed) return;

    setIsLeaving(true);
    setMessage("");
    try {
      const membershipProfileId = activeMembership.profile_id || activeMembership.user_id || currentUserId;
      if (!membershipProfileId) throw new Error("Could not identify your crew membership.");

      const { error } = await supabase
        .from("crew_members")
        .update({ status: "left" })
        .eq("crew_id", activeMembership.crew_id)
        .or(`profile_id.eq.${membershipProfileId},user_id.eq.${membershipProfileId}`);
      if (error) throw error;
      await loadCrews();
      setActivePanel(null);
      setMessage(isPending ? "Crew request cancelled." : "You have left the crew.");
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not leave crew."));
    } finally {
      setIsLeaving(false);
    }
  }

  function renderCrewCard(crew: Crew | any) {
    const styles = asPlayStyles(crew.play_styles);
    const memberCount = crew.crew_members?.[0]?.count ?? crew.members ?? 0;
    const isOwnCrew = currentUserId && crew.owner_id === currentUserId;
    const isMyCrew = activeMembership?.crew_id === crew.id;

    return (
      <article className={`card stack crew-card theme-${crew.crew_theme || "midnight"}`} key={crew.id || crew.name} style={{ ["--crew-accent" as string]: crew.crew_color || "#b35cff" }}>
        <div className="crew-card-media">
          {crew.photo_url ? <img src={crew.photo_url} alt="" /> : <span>{initials(crew.name)}</span>}
        </div>
        <div className="crew-card-heading">
          <span className="eyebrow">{eraLabel(crew.game_scope)}</span>
          <h2 className="h2">{crew.name}</h2>
        </div>
        <p className="copy">{crew.bio || crew.description || crew.style || "No crew bio filed yet."}</p>
        <div className="crew-chip-row">
          <span className="pill">{memberCount} members</span>
          <span className="pill hot">{statusLabel(crew.recruitment_status)}</span>
          <span className="pill">Rep {crew.reputation_score ?? crew.rep ?? 0}</span>
        </div>
        {styles.length > 0 && (
          <div className="crew-mini-tags">
            {styles.slice(0, 5).map((style) => <span key={style}>{style}</span>)}
          </div>
        )}
        {crew.owner_username && <p className="copy faint">Crew lead: {crew.owner_username}</p>}
        <div className="button-row crew-card-actions">
          {crew.slug ? <Link className="button" href={`/crews/${crew.slug}`}>Open crew</Link> : null}
          {hasSupabaseEnv && crew.id && !isMyCrew && !isOwnCrew ? (
            <button className="button primary" type="button" onClick={() => void joinCrew(crew)} disabled={Boolean(activeMembership) || crew.recruitment_status === "closed" || crew.recruitment_status === "invite_only"}>
              {crew.recruitment_status === "request" ? "Request join" : "Join crew"}
            </button>
          ) : null}
          {isMyCrew ? <span className="pill hot">Your crew</span> : null}
        </div>
      </article>
    );
  }

  return (
    <div className="page stack crews-page crews-page-clean">
      <section className="crews-clean-header crews-clean-header-minimal">
        <span className="eyebrow">CREWS</span>
      </section>

      {message && <section className="muted-card copy">{message}</section>}

      <section className="crew-action-grid crew-action-grid-news-style">
        {!activeMembership && (
          <>
            <CrewActionCard
              title="Create a Crew"
              description="Register your crew identity, play styles, colour and recruitment status."
              cta={activePanel === "create" ? "Close creator" : "Start registration"}
              imageUrl={createCardImage}
              active={activePanel === "create"}
              onClick={() => setActivePanel(activePanel === "create" ? null : "create")}
            />
            <CrewActionCard
              title="Search for a Crew"
              description="Browse crews recruiting for heists, roleplay, missions, racing and meets."
              cta={activePanel === "search" ? "Hide crew board" : "Browse crews"}
              imageUrl={searchCardImage}
              active={activePanel === "search"}
              onClick={() => setActivePanel(activePanel === "search" ? null : "search")}
            />
          </>
        )}

        {activeMembership && currentCrew && !isPending && (
          <>
            <CrewActionCard
              title="Crew Feed"
              description={`Open ${currentCrew.name}'s social feed, posts and operation board.`}
              cta="Enter crew"
              imageUrl={currentCrew.photo_url || createCardImage}
              href={`/crews/${currentCrew.slug}`}
            />
            {isOwner ? (
              <CrewActionCard
                  title="Manage My Crew"
                description="Edit identity, recruitment, play styles, members and future upgrades."
                cta="Open management"
                imageUrl={currentCrew.photo_url || searchCardImage}
                href={`/crews/${currentCrew.slug}`}
              />
            ) : (
              <CrewActionCard
                  title="Leave Crew"
                description="Depart your current crew before joining another manifest."
                cta={isLeaving ? "Leaving..." : "Leave crew"}
                imageUrl={currentCrew.photo_url || searchCardImage}
                danger
                disabled={isLeaving}
                onClick={() => void leaveCrew()}
              />
            )}
          </>
        )}

        {activeMembership && isPending && currentCrew && (
          <>
            <CrewActionCard
              title="View Request"
              description={`Your request to join ${currentCrew.name} is waiting for approval.`}
              cta="View crew"
              imageUrl={currentCrew.photo_url || createCardImage}
              href={`/crews/${currentCrew.slug}`}
            />
            <CrewActionCard
              title="Cancel Request"
              description="Cancel this pending request before joining another crew."
              cta={isLeaving ? "Cancelling..." : "Cancel request"}
              imageUrl={currentCrew.photo_url || searchCardImage}
              danger
              disabled={isLeaving}
              onClick={() => void leaveCrew()}
            />
          </>
        )}
      </section>

      {!activeMembership && activePanel === "create" && (
        <form className="card stack crew-registration-card crew-panel-card" onSubmit={createCrew}>
          <span className="eyebrow">Create a Crew</span>
          <h2 className="h2">Register crew</h2>
          <p className="copy">Crews can operate in Los Santos, Leonida, or bridge both. Base6 stays Leonida-facing, but lets crews form before launch.</p>

          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Crew name" />
          <textarea className="textarea" value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Crew bio. What are you about? Heists, RP, meets, chaos, clean money, launch squad..." />
          <input className="input" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="Crew photo / emblem URL" />

          <div className="crew-form-row">
            <label className="crew-field-label">
              <span>Era</span>
              <select className="input" value={gameScope} onChange={(event) => setGameScope(event.target.value as CrewEra)}>
                <option value="GTA_VI">Leonida / GTA VI</option>
                <option value="GTA_V">Los Santos / GTA V</option>
                <option value="BOTH">Both</option>
              </select>
            </label>
            <label className="crew-field-label">
              <span>Joining</span>
              <select className="input" value={status} onChange={(event) => setStatus(event.target.value as JoinPolicy)}>
                <option value="open">Open recruitment</option>
                <option value="request">Request approval</option>
                <option value="invite_only">Invite only</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>

          <div className="crew-form-row compact">
            <label className="crew-field-label">
              <span>Crew colour</span>
              <input className="input color-input" type="color" value={crewColor} onChange={(event) => setCrewColor(event.target.value)} />
            </label>
            <label className="crew-field-label">
              <span>Theme</span>
              <select className="input" value={crewTheme} onChange={(event) => setCrewTheme(event.target.value)}>
                {THEME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="crew-style-picker" aria-label="Play styles">
            <span className="crew-picker-title">Play styles</span>
            <div className="crew-style-grid">
              {PLAY_STYLE_OPTIONS.map((style) => (
                <label key={style} className={`crew-style-check ${playStyles.includes(style) ? "selected" : ""}`}>
                  <input type="checkbox" checked={playStyles.includes(style)} onChange={() => togglePlayStyle(style)} />
                  <span>{style}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="button primary" type="submit" disabled={isSaving}>
            {isSaving ? "Registering..." : "Register crew"}
          </button>
        </form>
      )}

      {(!activeMembership && activePanel === "search") || activeMembership ? (
        <section className="stack crew-search-section">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">Crew Board</span>
              <h2 className="h2">Open manifests</h2>
            </div>
            <input className="input crew-search-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search crews, play styles, era..." />
          </div>
          {isLoading ? <p className="copy">Loading crews...</p> : null}
          <div className="crew-card-grid">
            {filteredCrews.map((crew) => renderCrewCard(crew))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
