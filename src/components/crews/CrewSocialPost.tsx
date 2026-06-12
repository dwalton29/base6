import type { CrewPost } from "@/lib/crews";
import { initials, profileName, timeAgo } from "@/lib/crews";

export default function CrewSocialPost({ post }: { post: CrewPost }) {
  return (
    <article className="crew-social-post">
      <div className="crew-social-post-head">
        <div className="crew-member-avatar small">
          {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" /> : initials(post.profiles?.username)}
        </div>
        <div>
          <strong>{profileName(post.profiles)} · Crew</strong>
          <span>{post.post_type || "Update"} · {timeAgo(post.created_at)}</span>
        </div>
        <button type="button" aria-label="Post options">•••</button>
      </div>
      {post.title && <h3>{post.title}</h3>}
      {post.body && <p>{post.body}</p>}
      {post.image_url && <img className="crew-social-image" src={post.image_url} alt="" loading="lazy" />}
    </article>
  );
}
