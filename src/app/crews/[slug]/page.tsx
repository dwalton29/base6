"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import CrewOperationCard from "@/components/crews/CrewOperationCard";
import CrewSocialPost from "@/components/crews/CrewSocialPost";
import {
  EVENT_TYPES,
  PLATFORMS,
  POST_TYPES,
  asPlayStyles,
  eraLabel,
  getSupabaseErrorMessage,
  initials,
  localInputToIso,
  memberProfileId,
  operationDefaultTimes,
  profileMap,
  profileName,
  statusLabel,
  type Crew,
  type CrewEvent,
  type CrewEventAttendee,
  type CrewMember,
  type CrewPost,
  type Membership,
  type ProfileLite,
} from "@/lib/crews";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type PageParams = {
  params: { slug: string };
};

export default function CrewManifestPage({ params }: PageParams) {
  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [myMemberships, setMyMemberships] = useState<Membership[]>([]);
  const [posts, setPosts] = useState<CrewPost[]>([]);
  const [events, setEvents] = useState<CrewEvent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileLite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "events" | "members">("feed");

  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeKind, setComposeKind] = useState<"post" | "lfg">("post");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postType, setPostType] = useState("Update");

  const defaults = useMemo(() => operationDefaultTimes(), []);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("Heists");
  const [eventDescription, setEventDescription] = useState("");
  const [eventPlatform, setEventPlatform] = useState("Any");
  const [eventStart, setEventStart] = useState(defaults.start);
  const [eventEnd, setEventEnd] = useState(defaults.end);
  const [eventMaxPlayers, setEventMaxPlayers] = useState("4");
  const [eventImageUrl, setEventImageUrl] = useState("");

  const activeMembership = useMemo(
    () => myMemberships.find((membership) => membership.status === "active" || membership.status === "pending") || null,
    [myMemberships]
  );
  const myCrewMembership = activeMembership && crew && activeMembership.crew_id === crew.id ? activeMembership : null;
  const isOwner = Boolean(crew && currentUserId && crew.owner_id === currentUserId);
  const isCrewMember = Boolean(myCrewMembership && myCrewMembership.status === "active");
  const canPost = isOwner || isCrewMember;

  async function loadCrew() {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Add Supabase env vars and run the crew SQL to open live crew manifests.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;
    setCurrentUserId(userId);

    const { data: crewData, error: crewError } = await supabase
      .from("crews")
      .select("id, owner_id, name, slug, bio, description, photo_url, crew_color, crew_theme, game_scope, play_styles, recruitment_status, reputation_score, created_at")
      .eq("slug", params.slug)
      .maybeSingle();

    if (crewError) {
      setMessage(crewError.message);
      setCrew(null);
      setIsLoading(false);
      return;
    }

    const nextCrew = crewData as Crew | null;
    setCrew(nextCrew);

    if (!nextCrew) {
      setMessage("Crew manifest not found.");
      setIsLoading(false);
      return;
    }

    if (userId) {
      const { data: membershipData } = await supabase
        .from("crew_members")
        .select("crew_id, profile_id, user_id, role, status")
        .or(`profile_id.eq.${userId},user_id.eq.${userId}`)
        .in("status", ["active", "pending"]);
      setMyMemberships((membershipData as Membership[] | null) || []);
    } else {
      setMyMemberships([]);
    }

    const [{ data: memberData }, { data: postData }, { data: eventData }] = await Promise.all([
      supabase
        .from("crew_members")
        .select("crew_id, profile_id, user_id, role, status, joined_at")
        .eq("crew_id", nextCrew.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true }),
      supabase
        .from("crew_posts")
        .select("id, crew_id, author_id, post_type, title, body, image_url, created_at")
        .eq("crew_id", nextCrew.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("crew_events")
        .select("id, crew_id, host_id, title, event_type, description, game_context, platform, starts_at, ends_at, image_url, max_players, status, created_at")
        .eq("crew_id", nextCrew.id)
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(30),
    ]);

    const memberRows = (memberData as CrewMember[] | null) || [];
    const postRows = (postData as CrewPost[] | null) || [];
    const eventRows = (eventData as CrewEvent[] | null) || [];
    const eventIds = eventRows.map((operation) => operation.id);

    const { data: attendeeRows } = eventIds.length
      ? await supabase
        .from("crew_event_attendees")
        .select("event_id, profile_id, user_id, status")
        .in("event_id", eventIds)
        .eq("status", "joined")
      : { data: [] };

    const attendees = (attendeeRows as CrewEventAttendee[] | null) || [];
    const attendeeCount = new Map<string, number>();
    const myEventIds = new Set<string>();
    attendees.forEach((attendee) => {
      attendeeCount.set(attendee.event_id, (attendeeCount.get(attendee.event_id) || 0) + 1);
      if (userId && (attendee.profile_id === userId || attendee.user_id === userId)) myEventIds.add(attendee.event_id);
    });

    const profileIds = Array.from(new Set([
      userId,
      nextCrew.owner_id,
      ...memberRows.map((member) => memberProfileId(member)),
      ...postRows.map((post) => post.author_id),
      ...eventRows.map((operation) => operation.host_id),
    ].filter((id): id is string => Boolean(id))));

    const { data: profileRows } = profileIds.length
      ? await supabase
        .from("profiles")
        .select("id, username, avatar_url, platform, platform_handle, boarding_flight, boarding_seat")
        .in("id", profileIds)
      : { data: [] };

    const profiles = profileMap(profileRows as ProfileLite[] | null);
    setCurrentProfile(userId ? profiles.get(userId) || null : null);
    setCrew({
      ...nextCrew,
      owner_profile: nextCrew.owner_id ? profiles.get(nextCrew.owner_id) || null : null,
    });
    setMembers(memberRows.map((member) => ({ ...member, profiles: profiles.get(memberProfileId(member) || "") || null })));
    setPosts(postRows.map((post) => ({ ...post, profiles: post.author_id ? profiles.get(post.author_id) || null : null })));
    setEvents(eventRows.map((operation) => ({
      ...operation,
      profiles: operation.host_id ? profiles.get(operation.host_id) || null : null,
      attendee_count: attendeeCount.get(operation.id) || 0,
      current_user_joined: myEventIds.has(operation.id),
    })));
    setIsLoading(false);
  }

  useEffect(() => { void loadCrew(); }, [params.slug]);

  async function awardStamp(stampCode: string) {
    if (!hasSupabaseEnv || !supabase || !currentUserId) return;

    const { data: existingStamp, error: lookupError } = await supabase
      .from("user_passport_stamps")
      .select("stamp_code")
      .eq("user_id", currentUserId)
      .eq("stamp_code", stampCode)
      .maybeSingle();

    if (lookupError || existingStamp) return;
    await supabase.from("user_passport_stamps").insert({ user_id: currentUserId, stamp_code: stampCode });
  }

  async function joinCrew() {
    if (!hasSupabaseEnv || !supabase || !crew) return;
    setMessage("");
    setIsSaving(true);

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
      setMessage(nextStatus === "pending" ? "Join request sent to crew command." : "You joined the crew manifest.");
      await loadCrew();
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not join crew."));
    } finally {
      setIsSaving(false);
    }
  }

  async function leaveCrew() {
    if (!hasSupabaseEnv || !supabase || !myCrewMembership || !currentUserId) return;
    setMessage("");
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("crew_members")
        .update({ status: "left", left_at: new Date().toISOString() })
        .eq("crew_id", myCrewMembership.crew_id)
        .or(`profile_id.eq.${currentUserId},user_id.eq.${currentUserId}`);
      if (error) throw error;
      setMessage("You left the crew manifest.");
      await loadCrew();
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not leave crew."));
    } finally {
      setIsSaving(false);
    }
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || !crew || !canPost || isSaving) return;
    setMessage("");
    setIsSaving(true);

    try {
      if (!postBody.trim() && !postTitle.trim()) throw new Error("Write something for the crew feed.");
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in before posting.");

      const { error } = await supabase.from("crew_posts").insert({
        crew_id: crew.id,
        author_id: user.id,
        post_type: postType,
        title: postTitle.trim() || null,
        body: postBody.trim() || null,
        image_url: postImageUrl.trim() || null,
      });
      if (error) throw error;
      setPostTitle("");
      setPostBody("");
      setPostImageUrl("");
      setIsComposeModalOpen(false);
      setActiveTab("feed");
      await loadCrew();
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not post to crew feed."));
    } finally {
      setIsSaving(false);
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || !crew || !canPost || isSaving) return;
    setMessage("");
    setIsSaving(true);

    try {
      if (!eventTitle.trim()) throw new Error("Operation title is required.");
      const startIso = localInputToIso(eventStart);
      const endIso = localInputToIso(eventEnd);
      if (!startIso || !endIso) throw new Error("Add valid start and end times.");
      if (new Date(endIso).getTime() <= new Date(startIso).getTime()) throw new Error("The end time must be after the start time.");
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in before posting an operation.");

      const { data: operation, error } = await supabase.from("crew_events").insert({
        crew_id: crew.id,
        host_id: user.id,
        title: eventTitle.trim(),
        event_type: eventType,
        description: eventDescription.trim() || null,
        game_context: crew.game_scope || "GTA_VI",
        platform: eventPlatform,
        starts_at: startIso,
        ends_at: endIso,
        image_url: eventImageUrl.trim() || null,
        max_players: Math.max(1, Math.min(64, Number.parseInt(eventMaxPlayers, 10) || 1)),
        status: "upcoming",
      }).select("id").single();
      if (error) throw error;

      if (operation?.id) {
        await supabase.from("crew_event_attendees").insert({
          event_id: operation.id,
          crew_id: crew.id,
          profile_id: user.id,
          user_id: user.id,
          status: "joined",
        });
      }

      await supabase.from("crew_posts").insert({
        crew_id: crew.id,
        author_id: user.id,
        post_type: "LFG",
        title: eventTitle.trim(),
        body: eventDescription.trim() || `${eventType} operation posted to the crew board.`,
        image_url: eventImageUrl.trim() || null,
      });

      await awardStamp("first_operation");
      setEventTitle("");
      setEventDescription("");
      setEventImageUrl("");
      setEventStart(defaults.start);
      setEventEnd(defaults.end);
      setIsComposeModalOpen(false);
      setActiveTab("events");
      await loadCrew();
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not post operation."));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleJoinOperation(operation: CrewEvent) {
    if (!hasSupabaseEnv || !supabase || !crew || !currentUserId || !canPost) return;
    setMessage("");
    setIsSaving(true);

    try {
      if (operation.current_user_joined) {
        const { error } = await supabase
          .from("crew_event_attendees")
          .update({ status: "left", left_at: new Date().toISOString() })
          .eq("event_id", operation.id)
          .or(`profile_id.eq.${currentUserId},user_id.eq.${currentUserId}`);
        if (error) throw error;
      } else {
        const maxPlayers = Number(operation.max_players || 0);
        if (maxPlayers > 0 && Number(operation.attendee_count || 0) >= maxPlayers) throw new Error("This operation is already full.");
        const { error } = await supabase.from("crew_event_attendees").insert({
          event_id: operation.id,
          crew_id: crew.id,
          profile_id: currentUserId,
          user_id: currentUserId,
          status: "joined",
        });
        if (error) throw error;
        await awardStamp("on_the_manifest");
      }
      await loadCrew();
    } catch (error) {
      setMessage(getSupabaseErrorMessage(error, "Could not update operation."));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="page stack"><section className="card stack"><span className="eyebrow">Crew manifest</span><p className="copy">Opening crew records...</p></section></div>;
  }

  if (!crew) {
    return (
      <div className="page stack">
        <section className="card stack">
          <span className="eyebrow">Crew manifest</span>
          <h1 className="h1">Crew not found.</h1>
          {message && <p className="copy">{message}</p>}
          <Link className="button primary" href="/crews">Back to crews</Link>
        </section>
      </div>
    );
  }

  const feedItems = [
    ...events.map((operation) => ({ kind: "operation" as const, createdAt: operation.created_at, operation })),
    ...posts.map((post) => ({ kind: "post" as const, createdAt: post.created_at, post })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="page stack crew-detail-page" style={{ ["--crew-accent" as string]: crew.crew_color || "#b35cff" }}>
      <Link className="mini-link" href="/crews">← Back to crews</Link>
      {message && <section className="muted-card copy">{message}</section>}

      <section className={`crew-feed-shell theme-${crew.crew_theme || "midnight"}`}>
        <div className="crew-feed-cover" style={crew.photo_url ? { backgroundImage: `url(${crew.photo_url})` } : undefined}>
          <div className="crew-feed-cover-overlay" />
          <div className="crew-feed-header-content">
            <div className="crew-feed-emblem">{crew.photo_url ? <img src={crew.photo_url} alt="" /> : initials(crew.name)}</div>
            <div>
              <span className="eyebrow">{eraLabel(crew.game_scope)}</span>
              <h1>{crew.name}</h1>
              <p>{crew.bio || crew.description || "No crew bio filed yet."}</p>
            </div>
          </div>
        </div>

      </section>

      {!canPost && (
        <section className="crew-access-row">
          <div>
            <strong>{statusLabel(crew.recruitment_status)}</strong>
            <span>{members.length} passengers on the manifest</span>
          </div>
          {!myCrewMembership && !isOwner ? <button className="button primary" type="button" onClick={() => void joinCrew()} disabled={isSaving || Boolean(activeMembership) || crew.recruitment_status === "closed" || crew.recruitment_status === "invite_only"}>{crew.recruitment_status === "request" ? "Request join" : "Join crew"}</button> : null}
        </section>
      )}

      {canPost && (
        <section className="crew-inline-composer" role="button" tabIndex={0} onClick={() => { setComposeKind("post"); setIsComposeModalOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { setComposeKind("post"); setIsComposeModalOpen(true); } }}>
          <div className="crew-member-avatar small">
            {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="" /> : initials(currentProfile?.username)}
          </div>
          <div className="crew-inline-composer-input">Create a Post</div>
        </section>
      )}

      <div className="crew-feed-tabs" role="tablist" aria-label="Crew sections">
        <button className={activeTab === "feed" ? "active" : ""} type="button" onClick={() => setActiveTab("feed")}>Feed</button>
        <button className={activeTab === "events" ? "active" : ""} type="button" onClick={() => setActiveTab("events")}>LFG</button>
        <button className={activeTab === "members" ? "active" : ""} type="button" onClick={() => setActiveTab("members")}>Members</button>
      </div>

      {activeTab === "feed" && (
        <section className="crew-feed-list social-style-feed">
          {feedItems.length === 0 ? <p className="copy faint">No crew posts yet.</p> : feedItems.map((item) => (
            item.kind === "operation"
              ? <CrewOperationCard key={`operation-${item.operation.id}`} operation={item.operation} canJoin={canPost} isSaving={isSaving} onJoin={() => void toggleJoinOperation(item.operation)} />
              : <CrewSocialPost key={`post-${item.post.id}`} post={item.post} />
          ))}
        </section>
      )}

      {activeTab === "events" && (
        <section className="crew-feed-list social-style-feed">
          {events.length === 0 ? <p className="copy faint">No LFG operations posted yet.</p> : events.map((operation) => (
            <CrewOperationCard key={operation.id} operation={operation} canJoin={canPost} isSaving={isSaving} onJoin={() => void toggleJoinOperation(operation)} />
          ))}
        </section>
      )}

      {activeTab === "members" && (
        <section className="card stack crew-manifest-card">
          <span className="eyebrow">Crew manifest</span>
          <div className="crew-member-list">
            {members.length === 0 ? <p className="copy faint">No active members yet.</p> : members.map((member) => (
              <div className="crew-member-row" key={`${member.crew_id}-${memberProfileId(member) || member.joined_at}`}>
                <div className="crew-member-avatar">
                  {member.profiles?.avatar_url ? <img src={member.profiles.avatar_url} alt="" /> : initials(member.profiles?.username)}
                </div>
                <div>
                  <strong>{profileName(member.profiles)}</strong>
                  <span>{member.role}{member.profiles?.boarding_flight ? ` · ${member.profiles.boarding_flight} ${member.profiles.boarding_seat || ""}` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isComposeModalOpen && (
        <div className="base6-modal-backdrop" role="presentation" onMouseDown={() => setIsComposeModalOpen(false)}>
          <form className="base6-modal crew-compose-modal" onSubmit={composeKind === "lfg" ? createEvent : createPost} onMouseDown={(event) => event.stopPropagation()}>
            <div className="base6-modal-header">
              <div><span className="eyebrow">Crew feed</span><h2>Create a Post</h2></div>
              <button type="button" onClick={() => setIsComposeModalOpen(false)}>×</button>
            </div>

            <div className="crew-compose-kind-toggle" role="tablist" aria-label="Post type">
              <button className={composeKind === "post" ? "active" : ""} type="button" onClick={() => setComposeKind("post")}>General post</button>
              <button className={composeKind === "lfg" ? "active" : ""} type="button" onClick={() => setComposeKind("lfg")}>LFG post</button>
            </div>

            {composeKind === "post" ? (
              <>
                <input className="input" value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="Post title" />
                <select className="input" value={postType} onChange={(event) => setPostType(event.target.value)}>{POST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                <textarea className="textarea" value={postBody} onChange={(event) => setPostBody(event.target.value)} placeholder="Post to the crew feed..." />
                <input className="input" value={postImageUrl} onChange={(event) => setPostImageUrl(event.target.value)} placeholder="Optional image URL" />
                <button className="button primary" type="submit" disabled={isSaving}>Post to crew</button>
              </>
            ) : (
              <>
                <input className="input" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="LFG title" />
                <div className="crew-form-row compact">
                  <select className="input" value={eventType} onChange={(event) => setEventType(event.target.value)}>{EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                  <select className="input" value={eventPlatform} onChange={(event) => setEventPlatform(event.target.value)}>{PLATFORMS.map((nextPlatform) => <option key={nextPlatform} value={nextPlatform}>{nextPlatform}</option>)}</select>
                </div>
                <div className="crew-form-row compact">
                  <label className="crew-modal-field"><span>Starts</span><input className="input" type="datetime-local" value={eventStart} onChange={(event) => setEventStart(event.target.value)} /></label>
                  <label className="crew-modal-field"><span>Ends</span><input className="input" type="datetime-local" value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} /></label>
                </div>
                <div className="crew-form-row compact">
                  <label className="crew-modal-field"><span>Players needed</span><input className="input" type="number" min="1" max="64" value={eventMaxPlayers} onChange={(event) => setEventMaxPlayers(event.target.value)} /></label>
                  <label className="crew-modal-field"><span>Image URL</span><input className="input" value={eventImageUrl} onChange={(event) => setEventImageUrl(event.target.value)} placeholder="Optional Supabase image URL" /></label>
                </div>
                <textarea className="textarea" value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} placeholder="Need drivers, hackers, roleplay actors, photographers, backup?" />
                <button className="button primary" type="submit" disabled={isSaving}>Post LFG</button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
