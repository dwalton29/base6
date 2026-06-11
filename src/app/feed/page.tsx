"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { feed as demoFeed } from "@/components/DemoData";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type Post = {
  id: string;
  post_type: string | null;
  title: string | null;
  body: string | null;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null; passport_number: string | null } | null;
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("social");
  const [isSaving, setIsSaving] = useState(false);

  async function loadPosts() {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Add Supabase env vars to load the live community feed.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("community_posts")
      .select("id, post_type, title, body, created_at, profiles(username, avatar_url, passport_number)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) setMessage(error.message);
    setPosts((data as Post[] | null) || []);
    setIsLoading(false);
  }

  useEffect(() => { loadPosts(); }, []);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || isSaving) return;
    setMessage("");
    setIsSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Check in or log in before posting to the lounge feed.");
      if (!body.trim() && !title.trim()) throw new Error("Write something for the lounge.");

      const { error } = await supabase.from("community_posts").insert({
        author_id: user.id,
        post_type: postType,
        title: title.trim() || null,
        body: body.trim() || null,
      });
      if (error) throw error;

      setTitle("");
      setBody("");
      await loadPosts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not post to feed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page stack">
      <PageHeader eyebrow="Community feed" title="Less marketplace, more movement." copy="The feed is now Supabase-backed: crew posts, LFG chatter, screenshots, event announcements and reputation moments." />
      {message && <section className="muted-card copy">{message}</section>}

      <section className="grid grid-2">
        <form className="card stack" onSubmit={createPost}>
          <span className="eyebrow">Lounge broadcast</span>
          <h2 className="h2">Post to the feed</h2>
          <select className="input" value={postType} onChange={(event) => setPostType(event.target.value)}>
            <option value="social">Social</option>
            <option value="crew">Crew</option>
            <option value="lfg">LFG</option>
            <option value="event">Event</option>
            <option value="rep">Reputation</option>
          </select>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional title" />
          <textarea className="textarea" value={body} onChange={(event) => setBody(event.target.value)} placeholder="What’s happening in the lounge?" />
          <button className="button primary" type="submit" disabled={isSaving}>{isSaving ? "Posting..." : "Post to lounge"}</button>
        </form>

        <div className="card stack">
          <span className="eyebrow">Live status</span>
          <h2 className="h2">Feed connected</h2>
          <p className="copy">This gives base6 the first real community loop after check-in: arrive, get a passport, post, recruit, find players.</p>
          <div className="departure-board">
            <div className="board-row"><span>FEED</span><strong>{isLoading ? "LOADING" : "LIVE"}</strong></div>
            <div className="board-row"><span>POSTS</span><strong>{posts.length || "—"}</strong></div>
            <div className="board-row"><span>COMMENTS</span><strong>NEXT</strong></div>
          </div>
        </div>
      </section>

      <section className="grid grid-3">
        {(posts.length ? posts : demoFeed as any[]).map((post: any) => (
          <article className="card stack" key={post.id || post.title}>
            <div className="button-row" style={{ justifyContent: "space-between" }}>
              <span className="pill hot">{post.post_type || post.tag}</span>
              {post.created_at && <span className="pill">{formatWhen(post.created_at)}</span>}
            </div>
            <h2 className="h2">{post.title || "Lounge update"}</h2>
            <p className="copy">{post.body}</p>
            {post.profiles?.username && <p className="copy faint">Posted by {post.profiles.username} · {post.profiles.passport_number}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
