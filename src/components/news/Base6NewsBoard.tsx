"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type NewsCategory = "ROCKSTAR" | "TRAILER" | "COMMUNITY" | "BASE6" | "CREWS" | "EVENT" | string;

type Base6NewsRow = {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  body: string | null;
  category: NewsCategory | null;
  image_url: string | null;
  source_url: string | null;
  source_label: string | null;
  video_url: string | null;
  published_at: string | null;
  is_featured: boolean | null;
  is_published: boolean | null;
  display_priority: number | null;
};

const demoNews: Base6NewsRow[] = [
  {
    id: "demo-trailer-2",
    title: "Trailer watch: GTA VI Trailer 1",
    slug: "trailer-watch-gta-vi-trailer-1",
    summary: "Watch GTA VI Trailer 1 and keep official drops pinned on the Leonida news board.",
    body: "This is a demo Base6 news card. Replace it with a Supabase row when your news table is live.",
    category: "TRAILER",
    image_url: null,
    source_url: "https://www.rockstargames.com/VI",
    source_label: "Official page",
    video_url: "https://www.youtube.com/@RockstarGames",
    published_at: new Date().toISOString(),
    is_featured: true,
    is_published: true,
    display_priority: 1,
  },
  {
    id: "demo-base6-update",
    title: "Base6 passports are now boarding",
    slug: "base6-passports-boarding",
    summary: "Use this slot for patch notes, new stamps, passport updates and community features.",
    body: "The news system supports featured cards, images, source links and video links.",
    category: "BASE6",
    image_url: null,
    source_url: "/lounge",
    source_label: "Open lounge",
    video_url: null,
    published_at: new Date(Date.now() - 86400000).toISOString(),
    is_featured: true,
    is_published: true,
    display_priority: 20,
  },
  {
    id: "demo-community",
    title: "Community spotlight placeholder",
    slug: "community-spotlight-placeholder",
    summary: "Feature YouTube creators, theory videos, crew recruitment pushes and countdown posts here.",
    body: "External links open safely in a new tab. Internal Base6 links stay in-app.",
    category: "COMMUNITY",
    image_url: null,
    source_url: null,
    source_label: null,
    video_url: "https://www.youtube.com/",
    published_at: new Date(Date.now() - 172800000).toISOString(),
    is_featured: false,
    is_published: true,
    display_priority: 30,
  },
  {
    id: "demo-crews",
    title: "Crew board warm-up",
    slug: "crew-board-warm-up",
    summary: "Use news posts for crew announcements, events and launch-week community pushes.",
    body: "This gives the page a fuller 2x2 featured layout while live posts are still being added.",
    category: "CREWS",
    image_url: null,
    source_url: "/crews",
    source_label: "View crews",
    video_url: null,
    published_at: new Date(Date.now() - 259200000).toISOString(),
    is_featured: true,
    is_published: true,
    display_priority: 40,
  },
];

function isExternalUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function linkProps(href: string | null | undefined) {
  return isExternalUrl(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date TBC";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBC";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function categoryLabel(category: string | null | undefined) {
  return String(category || "NEWS").replace(/_/g, " ").toUpperCase();
}

function sortNews(a: Base6NewsRow, b: Base6NewsRow) {
  const priorityA = Number(a.display_priority ?? 100);
  const priorityB = Number(b.display_priority ?? 100);
  if (priorityA !== priorityB) return priorityA - priorityB;
  return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
}

function primaryHref(item: Base6NewsRow) {
  return item.video_url || item.source_url || "/news";
}

export default function Base6NewsBoard() {
  const [items, setItems] = useState<Base6NewsRow[]>(demoNews);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadNews() {
      if (!hasSupabaseEnv || !supabase) {
        setMessage("Demo news showing. Add the base6_news table to Supabase for live posts.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("base6_news")
        .select("id,title,slug,summary,body,category,image_url,source_url,source_label,video_url,published_at,is_featured,is_published,display_priority")
        .eq("is_published", true)
        .order("display_priority", { ascending: true })
        .order("published_at", { ascending: false })
        .limit(24);

      if (!alive) return;

      if (error) {
        setItems(demoNews);
        setMessage("Demo news showing. Run the Base6 news SQL to connect live posts.");
      } else {
        const liveItems = ((data || []) as Base6NewsRow[]).filter((item) => item.is_published !== false);
        setItems(liveItems.length ? liveItems : demoNews);
        setMessage(liveItems.length ? "" : "No live news yet. Showing starter cards.");
      }

      setIsLoading(false);
    }

    loadNews();
    return () => {
      alive = false;
    };
  }, []);

  const sortedItems = useMemo(() => [...items].sort(sortNews), [items]);
  const featuredItems = sortedItems.filter((item) => item.is_featured).slice(0, 4);
  const fallbackFeaturedItems = featuredItems.length ? featuredItems : sortedItems.slice(0, 4);
  const featuredIds = new Set(fallbackFeaturedItems.map((item) => item.id));
  const generalItems = sortedItems.filter((item) => !featuredIds.has(item.id));

  return (
    <section className="news-board stack" aria-label="Base6 news board">
      {message && !isLoading ? <div className="news-setup-note copy">{message}</div> : null}

      {fallbackFeaturedItems.length ? (
        <section className="news-section stack" aria-label="Featured news">
          <div className="news-featured-grid">
            {fallbackFeaturedItems.map((item) => <FeaturedNewsTile key={item.id} item={item} />)}
          </div>
        </section>
      ) : (
        <div className="news-setup-note copy">No news posts found.</div>
      )}

      {generalItems.length ? (
        <section className="news-section stack" aria-label="Latest news">
          <div className="blog-list">
            {generalItems.map((item) => <BlogNewsPost key={item.id} item={item} />)}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function FeaturedNewsTile({ item }: { item: Base6NewsRow }) {
  const href = primaryHref(item);

  return (
    <Link
      href={href}
      className="compactNewsCard compactFeatureCard base6FeatureCard"
      style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}
      {...linkProps(href)}
    >
      <span>{categoryLabel(item.category)}</span>
      <strong>{item.title}</strong>
    </Link>
  );
}

function BlogNewsPost({ item }: { item: Base6NewsRow }) {
  return (
    <article className="blog-post-card">
      <div className="blog-post-media" style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined} />
      <div className="blog-post-body">
        <span className="faint">{formatDate(item.published_at)} · {categoryLabel(item.category)}</span>
        <h2>{item.title}</h2>
        {item.summary ? <p className="copy">{item.summary}</p> : null}
        <NewsActions item={item} />
      </div>
    </article>
  );
}

function NewsActions({ item }: { item: Base6NewsRow }) {
  const sourceHref = item.source_url || null;
  const videoHref = item.video_url || null;
  const hasSource = Boolean(sourceHref);
  const hasVideo = Boolean(videoHref);

  if (!hasSource && !hasVideo) return null;

  return (
    <div className="news-actions">
      {hasSource ? (
        <Link className="button primary" href={sourceHref as string} {...linkProps(sourceHref)}>
          {item.source_label || (isExternalUrl(sourceHref) ? "Open source" : "Open")}
        </Link>
      ) : null}
      {hasVideo ? (
        <Link className="button" href={videoHref as string} {...linkProps(videoHref)}>
          Watch video
        </Link>
      ) : null}
    </div>
  );
}
