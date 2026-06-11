"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { feed as demoFeed } from "@/components/DemoData";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type SocialTag = "SOCIAL" | "LFG" | "CREW" | "ADVICE" | "MEDIA";
type GameFilter = "GTA_V" | "GTA_VI";
type ScopeFilter = "FOLLOWING" | "MY_POSTS";

type ProfileMini = {
  id: string;
  username: string | null;
  username_slug?: string | null;
  display_name?: string | null;
  avatar_url: string | null;
  passport_number?: string | null;
  platform?: string | null;
  platform_handle?: string | null;
};

type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string | null;
  parent_comment_id?: string | null;
  body: string | null;
  created_at: string;
  like_count?: number | null;
  likedByMe?: boolean;
  replies?: CommunityComment[];
  profiles?: ProfileMini | null;
};

type CommunityPost = {
  id: string;
  author_id: string | null;
  post_type: string | null;
  social_tag?: SocialTag | null;
  game_context?: GameFilter | null;
  title: string | null;
  body: string | null;
  image_url: string | null;
  platform?: string | null;
  lfg_category?: string | null;
  lfg_players_needed?: number | null;
  lfg_start_at?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  created_at: string;
  profiles?: ProfileMini | null;
};

type HydratedPost = CommunityPost & {
  likedByMe: boolean;
  comments: CommunityComment[];
};

const POST_FILTERS: Array<{ value: SocialTag; label: string }> = [
  { value: "SOCIAL", label: "Social" },
  { value: "LFG", label: "LFG" },
  { value: "CREW", label: "Crew" },
  { value: "ADVICE", label: "Advice" },
  { value: "MEDIA", label: "Media" },
];

const SCOPE_FILTERS: Array<{ value: ScopeFilter; label: string; helper: string }> = [
  { value: "FOLLOWING", label: "Following", helper: "Only posts from passengers you follow." },
  { value: "MY_POSTS", label: "My Posts", helper: "Only your own posts." },
];

const COMPOSER_TAGS: Array<{ value: SocialTag; label: string; helper: string }> = [
  { value: "SOCIAL", label: "Social", helper: "General lounge chat, theories and updates." },
  { value: "LFG", label: "LFG", helper: "Find people for launch sessions, cruising, racing or chaos." },
  { value: "CREW", label: "Crew", helper: "Recruit, announce or promote a crew." },
  { value: "ADVICE", label: "Advice", helper: "Ask a question or share something useful." },
  { value: "MEDIA", label: "Media", helper: "Screenshots, clips, trailer reactions or fan content." },
];

const PLATFORM_OPTIONS = ["Any", "PS5", "Xbox Series X|S", "PC", "Rockstar", "Undecided"];

function formatWhen(value: string | null | undefined) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const delta = Date.now() - date.getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

function displayName(profile?: ProfileMini | null) {
  return profile?.display_name || profile?.username || "Passenger";
}

function initials(profile?: ProfileMini | null) {
  return displayName(profile).slice(0, 2).toUpperCase();
}

function postTag(post: CommunityPost): SocialTag {
  const tag = (post.social_tag || post.post_type || "SOCIAL").toUpperCase();
  if (["LFG", "LOOKING_FOR_GROUP"].includes(tag)) return "LFG";
  if (["CREW", "CREWS"].includes(tag)) return "CREW";
  if (["ADVICE", "QUESTION"].includes(tag)) return "ADVICE";
  if (["MEDIA", "IMAGE", "CLIP"].includes(tag)) return "MEDIA";
  return "SOCIAL";
}

function profilePath(profile?: ProfileMini | null) {
  const handle = profile?.username_slug || profile?.username;
  return handle ? `/passport?user=${encodeURIComponent(handle)}` : "/passport";
}

function commentTotal(comments: CommunityComment[]): number {
  return comments.reduce((total, comment) => total + 1 + commentTotal(comment.replies || []), 0);
}

function updateCommentTree(
  comments: CommunityComment[],
  commentId: string,
  updater: (comment: CommunityComment) => CommunityComment
): CommunityComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return updater(comment);
    if (comment.replies?.length) {
      return { ...comment, replies: updateCommentTree(comment.replies, commentId, updater) };
    }
    return comment;
  });
}

function demoPosts(): HydratedPost[] {
  return (demoFeed as any[]).map((post, index) => ({
    id: post.id || `demo-${index}`,
    author_id: null,
    post_type: post.tag || "SOCIAL",
    social_tag: index % 3 === 0 ? "LFG" : index % 3 === 1 ? "CREW" : "SOCIAL",
    title: post.title || "Lounge update",
    body: post.body || "Community chatter will appear here once Supabase is connected.",
    image_url: post.image_url || null,
    platform: index % 2 === 0 ? "PS5" : "Xbox Series X|S",
    game_context: index % 2 === 0 ? "GTA_VI" : "GTA_V",
    lfg_category: index % 3 === 0 ? "Launch night" : null,
    lfg_players_needed: index % 3 === 0 ? 3 : null,
    lfg_start_at: null,
    like_count: 12 - index,
    comment_count: index + 1,
    created_at: new Date(Date.now() - index * 3600000).toISOString(),
    profiles: { id: `demo-profile-${index}`, username: index % 2 === 0 ? "leonida_local" : "vicebound", avatar_url: null, passport_number: "B6-LEO-DEMO" },
    likedByMe: false,
    comments: index === 0 ? [{
      id: "demo-comment-1",
      post_id: post.id || `demo-${index}`,
      author_id: null,
      parent_comment_id: null,
      body: "This is where the pre-launch theories start stacking up.",
      created_at: new Date(Date.now() - 1800000).toISOString(),
      like_count: 3,
      likedByMe: false,
      profiles: { id: "demo-comment-profile", username: "passport_control", avatar_url: null, passport_number: "B6-LEO-DEMO" },
      replies: [{
        id: "demo-reply-1",
        post_id: post.id || `demo-${index}`,
        author_id: null,
        parent_comment_id: "demo-comment-1",
        body: "See replies keeps the main thread cleaner too.",
        created_at: new Date(Date.now() - 900000).toISOString(),
        like_count: 1,
        likedByMe: false,
        profiles: { id: "demo-reply-profile", username: "vicebound", avatar_url: null, passport_number: "B6-LEO-DEMO" },
        replies: [],
      }],
    }] : [],
  }));
}

export default function SocialPage() {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileMini | null>(null);
  const [gameFilter, setGameFilter] = useState<GameFilter>("GTA_VI");
  const [activePostFilters, setActivePostFilters] = useState<SocialTag[]>([]);
  const [activeScopeFilters, setActiveScopeFilters] = useState<ScopeFilter[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyBoxes, setReplyBoxes] = useState<Record<string, boolean>>({});

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [socialTag, setSocialTag] = useState<SocialTag>("SOCIAL");
  const [composerGame, setComposerGame] = useState<GameFilter>("GTA_VI");
  const [platform, setPlatform] = useState("Any");
  const [lfgCategory, setLfgCategory] = useState("Free roam");
  const [playersNeeded, setPlayersNeeded] = useState("2");
  const [startAt, setStartAt] = useState("");

  async function loadPosts(
    nextGameFilter = gameFilter,
    nextPostFilters = activePostFilters,
    nextScopeFilters = activeScopeFilters
  ) {
    if (!hasSupabaseEnv || !supabase) {
      setPosts(demoPosts());
      setMessage("Demo feed loaded. Add Supabase env vars and run the social SQL for the live system.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;
    setCurrentUserId(userId);

    if (userId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, username_slug, display_name, avatar_url, passport_number, platform, platform_handle")
        .eq("id", userId)
        .maybeSingle();
      setCurrentProfile((profileData as ProfileMini | null) || null);
    } else {
      setCurrentProfile(null);
    }

    let followingIds: string[] = [];
    if (nextScopeFilters.includes("FOLLOWING") && userId) {
      const { data: followingRows } = await supabase
        .from("profile_follows")
        .select("following_id")
        .eq("follower_id", userId);
      followingIds = (followingRows || []).map((row: any) => row.following_id).filter(Boolean);
    }

    let query = supabase
      .from("community_posts")
      .select(`
        id,
        author_id,
        post_type,
        social_tag,
        game_context,
        title,
        body,
        image_url,
        platform,
        lfg_category,
        lfg_players_needed,
        lfg_start_at,
        like_count,
        comment_count,
        created_at,
        profiles:author_id(id, username, username_slug, display_name, avatar_url, passport_number, platform, platform_handle)
      `)
      .or("is_deleted.is.null,is_deleted.eq.false")
      .eq("game_context", nextGameFilter)
      .order("created_at", { ascending: false })
      .limit(60);

    if (nextPostFilters.length) {
      query = query.in("social_tag", nextPostFilters);
    }

    if (nextScopeFilters.includes("MY_POSTS")) {
      if (!userId) {
        setPosts([]);
        setMessage("Log in to see your own posts.");
        setIsLoading(false);
        return;
      }
      query = query.eq("author_id", userId);
    }

    if (nextScopeFilters.includes("FOLLOWING")) {
      if (!userId) {
        setPosts([]);
        setMessage("Log in to see posts from passengers you follow.");
        setIsLoading(false);
        return;
      }
      if (!followingIds.length) {
        setPosts([]);
        setMessage("Follow passengers to build your following feed.");
        setIsLoading(false);
        return;
      }
      query = query.in("author_id", followingIds);
    }

    const { data, error } = await query;
    if (error) {
      setMessage(error.message);
      setPosts([]);
      setIsLoading(false);
      return;
    }

    const basePosts = ((data || []) as any[]).map((post) => ({
      ...(post as CommunityPost),
      profiles: Array.isArray(post.profiles) ? post.profiles[0] || null : post.profiles || null,
      likedByMe: false,
      comments: [],
    }));
    const postIds = basePosts.map((post) => post.id);

    const [likesResponse, commentsResponse] = await Promise.all([
      userId && postIds.length
        ? supabase.from("community_post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      postIds.length
        ? supabase
            .from("community_comments")
            .select("id, post_id, author_id, parent_comment_id, body, created_at, like_count, profiles:author_id(id, username, username_slug, display_name, avatar_url, passport_number)")
            .in("post_id", postIds)
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const flatComments = (commentsResponse.data || []).map((rawComment: any) => ({
      ...(rawComment as CommunityComment),
      likedByMe: false,
      replies: [],
      profiles: Array.isArray(rawComment.profiles) ? rawComment.profiles[0] || null : rawComment.profiles || null,
    }));
    const commentIds = flatComments.map((comment) => comment.id);
    const commentLikesResponse = userId && commentIds.length
      ? await supabase.from("community_comment_likes").select("comment_id").eq("user_id", userId).in("comment_id", commentIds)
      : { data: [] as any[], error: null };

    const likedIds = new Set((likesResponse.data || []).map((row: any) => row.post_id));
    const likedCommentIds = new Set((commentLikesResponse.data || []).map((row: any) => row.comment_id));
    const commentsById = new Map<string, CommunityComment>();
    flatComments.forEach((comment) => {
      commentsById.set(comment.id, { ...comment, likedByMe: likedCommentIds.has(comment.id), replies: [] });
    });

    const commentsByPost = new Map<string, CommunityComment[]>();
    flatComments.forEach((comment) => {
      const hydrated = commentsById.get(comment.id);
      if (!hydrated) return;
      if (hydrated.parent_comment_id && commentsById.has(hydrated.parent_comment_id)) {
        const parent = commentsById.get(hydrated.parent_comment_id);
        parent?.replies?.push(hydrated);
        return;
      }
      const current = commentsByPost.get(hydrated.post_id) || [];
      current.push(hydrated);
      commentsByPost.set(hydrated.post_id, current);
    });

    setPosts(basePosts.map((post) => ({
      ...post,
      likedByMe: likedIds.has(post.id),
      comments: commentsByPost.get(post.id) || [],
    })));
    setIsLoading(false);
  }

  useEffect(() => {
    loadPosts("GTA_VI", [], []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeGameFilter(nextGameFilter: GameFilter) {
    setGameFilter(nextGameFilter);
    await loadPosts(nextGameFilter, activePostFilters, activeScopeFilters);
  }

  function togglePostFilter(nextFilter: SocialTag) {
    setActivePostFilters((current) => current.includes(nextFilter)
      ? current.filter((item) => item !== nextFilter)
      : [...current, nextFilter]);
  }

  function toggleScopeFilter(nextFilter: ScopeFilter) {
    setActiveScopeFilters((current) => current.includes(nextFilter)
      ? current.filter((item) => item !== nextFilter)
      : [...current, nextFilter]);
  }

  async function applyFilterModal() {
    setFilterModalOpen(false);
    await loadPosts(gameFilter, activePostFilters, activeScopeFilters);
  }

  async function clearFilterModal() {
    setActivePostFilters([]);
    setActiveScopeFilters([]);
    setFilterModalOpen(false);
    await loadPosts(gameFilter, [], []);
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || isSaving) return;
    setIsSaving(true);
    setMessage("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Log in or board your flight before posting.");
      if (!title.trim() && !body.trim() && !imageUrl.trim()) throw new Error("Write something before broadcasting to the lounge.");

      const payload = {
        author_id: user.id,
        post_type: "social",
        social_tag: socialTag,
        title: title.trim() || null,
        body: body.trim() || null,
        image_url: imageUrl.trim() || null,
        platform: platform === "Any" ? null : platform,
        game_context: composerGame,
        lfg_category: socialTag === "LFG" ? lfgCategory.trim() || null : null,
        lfg_players_needed: socialTag === "LFG" ? Number(playersNeeded || 0) || null : null,
        lfg_start_at: socialTag === "LFG" && startAt ? new Date(startAt).toISOString() : null,
      };

      const { error } = await supabase.from("community_posts").insert(payload);
      if (error) throw error;

      setTitle("");
      setBody("");
      setImageUrl("");
      setLfgCategory("Free roam");
      setPlayersNeeded("2");
      setStartAt("");
      setComposerOpen(false);
      await loadPosts(gameFilter, activePostFilters, activeScopeFilters);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create post.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleLike(post: HydratedPost) {
    if (!hasSupabaseEnv || !supabase) return;
    if (!currentUserId) {
      setMessage("Log in to like posts.");
      return;
    }

    setPosts((current) => current.map((item) => item.id === post.id ? {
      ...item,
      likedByMe: !item.likedByMe,
      like_count: Math.max(0, Number(item.like_count || 0) + (item.likedByMe ? -1 : 1)),
    } : item));

    if (post.likedByMe) {
      await supabase.from("community_post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("community_post_likes").insert({ post_id: post.id, user_id: currentUserId });
    }
  }

  async function addComment(postId: string, parentCommentId?: string) {
    if (!hasSupabaseEnv || !supabase) return;
    if (!currentUserId) {
      setMessage("Log in to comment.");
      return;
    }
    const draftKey = parentCommentId || postId;
    const draft = ((parentCommentId ? replyDrafts[draftKey] : commentDrafts[draftKey]) || "").trim();
    if (!draft) return;

    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: currentUserId,
      parent_comment_id: parentCommentId || null,
      body: draft,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (parentCommentId) {
      setReplyDrafts((current) => ({ ...current, [draftKey]: "" }));
      setReplyBoxes((current) => ({ ...current, [draftKey]: false }));
      setExpandedReplies((current) => ({ ...current, [draftKey]: true }));
    } else {
      setCommentDrafts((current) => ({ ...current, [draftKey]: "" }));
    }
    setExpandedPosts((current) => ({ ...current, [postId]: true }));
    await loadPosts(gameFilter, activePostFilters, activeScopeFilters);
  }

  async function toggleCommentLike(comment: CommunityComment) {
    if (!hasSupabaseEnv || !supabase) return;
    if (!currentUserId) {
      setMessage("Log in to like comments.");
      return;
    }

    setPosts((current) => current.map((post) => ({
      ...post,
      comments: updateCommentTree(post.comments, comment.id, (item) => ({
        ...item,
        likedByMe: !item.likedByMe,
        like_count: Math.max(0, Number(item.like_count || 0) + (item.likedByMe ? -1 : 1)),
      })),
    })));

    if (comment.likedByMe) {
      await supabase.from("community_comment_likes").delete().eq("comment_id", comment.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("community_comment_likes").insert({ comment_id: comment.id, user_id: currentUserId });
    }
  }

  async function reportPost(postId: string) {
    if (!hasSupabaseEnv || !supabase) return;
    if (!currentUserId) {
      setMessage("Log in to report content.");
      return;
    }
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason?.trim()) return;
    const { error } = await supabase.from("community_reports").insert({
      reporter_id: currentUserId,
      post_id: postId,
      reason: reason.trim(),
    });
    setMessage(error ? error.message : "Report sent to admin.");
  }

  function renderComment(post: HydratedPost, comment: CommunityComment, isReply = false) {
    const replies = comment.replies || [];
    const repliesOpen = Boolean(expandedReplies[comment.id]);
    const replyBoxOpen = Boolean(replyBoxes[comment.id]);

    return (
      <div className={isReply ? "social-comment social-reply" : "social-comment"} key={comment.id}>
        <Link className="social-comment-avatar" href={profilePath(comment.profiles)}>
          {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" /> : <span>{initials(comment.profiles)}</span>}
        </Link>
        <div className="social-comment-body">
          <div className="social-comment-bubble">
            <strong>{displayName(comment.profiles)}</strong>
            <p>{comment.body}</p>
          </div>
          <div className="social-comment-actions">
            <small>{formatWhen(comment.created_at)}</small>
            <button type="button" className={comment.likedByMe ? "active" : ""} onClick={() => toggleCommentLike(comment)}>
              ♡ {comment.like_count || 0}
            </button>
            <button type="button" onClick={() => setReplyBoxes((current) => ({ ...current, [comment.id]: !replyBoxOpen }))}>Reply</button>
            {replies.length > 0 && (
              <button type="button" onClick={() => setExpandedReplies((current) => ({ ...current, [comment.id]: !repliesOpen }))}>
                {repliesOpen ? "Hide replies" : `See ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>

          {replyBoxOpen && (
            <div className="social-comment-box social-reply-box">
              <span className="social-mini-avatar">
                {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="" /> : initials(currentProfile)}
              </span>
              <input
                className="input"
                value={replyDrafts[comment.id] || ""}
                onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))}
                placeholder={`Reply to ${displayName(comment.profiles)}...`}
              />
              <button className="button" type="button" onClick={() => addComment(post.id, comment.id)}>Send</button>
            </div>
          )}

          {repliesOpen && replies.length > 0 && (
            <div className="social-replies">
              {replies.map((reply) => renderComment(post, reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeComposerTag = useMemo(() => COMPOSER_TAGS.find((tag) => tag.value === socialTag), [socialTag]);
  const visiblePosts = posts.length ? posts : (!hasSupabaseEnv ? demoPosts() : []);

  return (
    <div className="page social-page stack">
      <section className="social-topline compact">
        <span className="eyebrow">SOCIAL</span>
      </section>

      <section className="social-layout">
        <main className="social-main stack">
          {message && <section className="social-message">{message}</section>}

          <button className="social-write-prompt" type="button" onClick={() => setComposerOpen(true)}>
            <span className="social-write-avatar">
              {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="" /> : initials(currentProfile)}
            </span>
            <span className="social-write-placeholder">What's happening in Leonida?</span>
          </button>

          <section className="social-feed-controls" aria-label="Social feed controls">
            <div className={`social-game-tabs ${gameFilter === "GTA_V" ? "is-v" : "is-vi"}`} role="tablist" aria-label="Choose game feed">
              <button className={gameFilter === "GTA_V" ? "active" : ""} type="button" onClick={() => changeGameFilter("GTA_V")}>GTA V</button>
              <button className={gameFilter === "GTA_VI" ? "active" : ""} type="button" onClick={() => changeGameFilter("GTA_VI")}>GTA VI</button>
            </div>
            <button className={activePostFilters.length || activeScopeFilters.length ? "social-filter-toggle active" : "social-filter-toggle"} type="button" onClick={() => setFilterModalOpen(true)}>
              Filters{activePostFilters.length || activeScopeFilters.length ? ` (${activePostFilters.length + activeScopeFilters.length})` : ""}
            </button>
          </section>

          <section className="social-feed-list">
            {isLoading ? (
              <div className="social-empty">Loading lounge traffic…</div>
            ) : visiblePosts.length ? (
              visiblePosts.map((post) => {
                const tag = postTag(post);
                const expanded = Boolean(expandedPosts[post.id]);
                const profileHref = profilePath(post.profiles);
                const totalComments = commentTotal(post.comments);

                return (
                  <article className="social-post-card" key={post.id}>
                    <header className="social-post-header">
                      <Link className="social-avatar" href={profileHref}>
                        {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" /> : <span>{initials(post.profiles)}</span>}
                      </Link>
                      <div className="social-post-author">
                        <Link href={profileHref}>{displayName(post.profiles)}</Link>
                        <small>{post.profiles?.passport_number || "BASE6 passenger"} · {formatWhen(post.created_at)}</small>
                      </div>
                      <span className={`social-tag ${tag.toLowerCase()}`}>{tag}</span>
                    </header>

                    {(post.title || post.body) && (
                      <div className="social-post-copy">
                        {post.title && <h2>{post.title}</h2>}
                        {post.body && <p>{post.body}</p>}
                      </div>
                    )}

                    {post.image_url && <img className="social-post-image" src={post.image_url} alt="Post attachment" />}

                    {(tag === "LFG" || post.platform) && (
                      <div className="social-lfg-strip">
                        {post.platform && <span>{post.platform}</span>}
                        {post.lfg_category && <span>{post.lfg_category}</span>}
                        {post.lfg_players_needed ? <span>{post.lfg_players_needed} needed</span> : null}
                        {post.lfg_start_at && <span>{formatWhen(post.lfg_start_at)}</span>}
                      </div>
                    )}

                    <footer className="social-actions">
                      <button type="button" onClick={() => toggleLike(post)} className={post.likedByMe ? "active" : ""}>♡ {post.like_count || 0}</button>
                      <button type="button" onClick={() => setExpandedPosts((current) => ({ ...current, [post.id]: !expanded }))}>💬 {post.comment_count || totalComments || 0}</button>
                      <button type="button" onClick={() => reportPost(post.id)}>Report</button>
                    </footer>

                    {expanded && (
                      <section className="social-comments">
                        {post.comments.length ? post.comments.map((comment) => renderComment(post, comment)) : <p className="copy faint">No comments yet. Start the thread.</p>}

                        <div className="social-comment-box">
                          <span className="social-mini-avatar">
                            {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="" /> : initials(currentProfile)}
                          </span>
                          <input
                            className="input"
                            value={commentDrafts[post.id] || ""}
                            onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                            placeholder="Write a comment..."
                          />
                          <button className="button" type="button" onClick={() => addComment(post.id)}>Send</button>
                        </div>
                      </section>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="social-empty">No posts here yet. Be the first passenger to broadcast.</div>
            )}
          </section>
        </main>
      </section>

      {filterModalOpen && (
        <div className="social-modal-backdrop" role="presentation" onClick={() => setFilterModalOpen(false)}>
          <div className="social-filter-modal" role="dialog" aria-modal="true" aria-label="Filter social posts" onClick={(event) => event.stopPropagation()}>
            <div className="social-modal-header compact-filter">
              <div>
                <span className="eyebrow">Filter feed</span>
                <h2>Choose posts</h2>
                <p>Keep the main feed clean, then narrow it when you need to.</p>
              </div>
              <button type="button" onClick={() => setFilterModalOpen(false)} aria-label="Close filters">×</button>
            </div>

            <div className="social-filter-modal-body">
              <section className="social-checkbox-group">
                <span className="eyebrow">Post type</span>
                {POST_FILTERS.map((item) => (
                  <label className="social-checkbox-row" key={item.value}>
                    <input type="checkbox" checked={activePostFilters.includes(item.value)} onChange={() => togglePostFilter(item.value)} />
                    <span>{item.label}</span>
                  </label>
                ))}
              </section>

              <section className="social-checkbox-group">
                <span className="eyebrow">Scope</span>
                {SCOPE_FILTERS.map((item) => (
                  <label className="social-checkbox-row" key={item.value}>
                    <input type="checkbox" checked={activeScopeFilters.includes(item.value)} onChange={() => toggleScopeFilter(item.value)} />
                    <span>
                      {item.label}
                      <small>{item.helper}</small>
                    </span>
                  </label>
                ))}
              </section>
            </div>

            <div className="button-row social-modal-actions social-filter-actions">
              <button className="button" type="button" onClick={clearFilterModal}>Clear</button>
              <button className="button" type="button" onClick={() => setFilterModalOpen(false)}>Cancel</button>
              <button className="button primary" type="button" onClick={applyFilterModal}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {composerOpen && (
        <div className="social-modal-backdrop" role="presentation" onClick={() => setComposerOpen(false)}>
          <div className="social-composer-modal" role="dialog" aria-modal="true" aria-label="Write a post" onClick={(event) => event.stopPropagation()}>
            <div className="social-modal-header">
              <div className="social-modal-title">
                <span className="social-write-avatar">
                  {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="" /> : initials(currentProfile)}
                </span>
                <div>
                  <span className="eyebrow">Broadcast</span>
                  <h2>Write a post</h2>
                  <p>{displayName(currentProfile)} · {activeComposerTag?.helper}</p>
                </div>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close composer">×</button>
            </div>

            <form className="social-composer" onSubmit={createPost}>
              <div className="social-composer-head compact three-fields">
                <select className="input" value={socialTag} onChange={(event) => setSocialTag(event.target.value as SocialTag)}>
                  {COMPOSER_TAGS.map((tag) => <option key={tag.value} value={tag.value}>{tag.label}</option>)}
                </select>
                <select className="input" value={composerGame} onChange={(event) => setComposerGame(event.target.value as GameFilter)}>
                  <option value="GTA_VI">GTA VI</option>
                  <option value="GTA_V">GTA V</option>
                </select>
                <select className="input" value={platform} onChange={(event) => setPlatform(event.target.value)}>
                  {PLATFORM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>

              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title, question or hook" />
              <textarea className="textarea social-textarea" value={body} onChange={(event) => setBody(event.target.value)} placeholder="What's happening in Leonida?" />
              <input className="input" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Optional image URL" />

              {socialTag === "LFG" && (
                <div className="social-composer-grid three">
                  <input className="input" value={lfgCategory} onChange={(event) => setLfgCategory(event.target.value)} placeholder="Activity: cruising, heists, racing..." />
                  <input className="input" type="number" min="1" max="30" value={playersNeeded} onChange={(event) => setPlayersNeeded(event.target.value)} placeholder="Players needed" />
                  <input className="input" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
                </div>
              )}

              <div className="button-row social-modal-actions">
                <button className="button" type="button" onClick={() => setComposerOpen(false)}>Cancel</button>
                <button className="button" type="button" onClick={() => { setTitle(""); setBody(""); setImageUrl(""); }}>Clear</button>
                <button className="button primary" type="submit" disabled={isSaving}>{isSaving ? "Posting..." : "Post"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
