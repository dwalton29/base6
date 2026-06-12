import type { CrewEvent } from "@/lib/crews";
import {
  FALLBACK_OPERATION_IMAGE,
  formatWhen,
  getOperationStatus,
  initials,
  operationStatusLabel,
  profileName,
  timeAgo,
} from "@/lib/crews";

export default function CrewOperationCard({ operation, canJoin, isSaving, onJoin }: { operation: CrewEvent; canJoin: boolean; isSaving: boolean; onJoin: () => void }) {
  const status = getOperationStatus(operation);
  const count = Number(operation.attendee_count || 0);
  const maxPlayers = Number(operation.max_players || 0);
  const isFull = maxPlayers > 0 && count >= maxPlayers;
  const joinDisabled = !canJoin || isSaving || status === "ended" || status === "cancelled" || (!operation.current_user_joined && isFull);

  return (
    <article className="crew-social-post crew-lfg-post-card">
      <div className="crew-social-post-head">
        <div className="crew-member-avatar small">
          {operation.profiles?.avatar_url ? <img src={operation.profiles.avatar_url} alt="" /> : initials(operation.profiles?.username)}
        </div>
        <div>
          <strong>{profileName(operation.profiles)} · Crew LFG</strong>
          <span>{operation.event_type || "LFG"} · {timeAgo(operation.created_at)}</span>
        </div>
        <button type="button" aria-label="LFG options">•••</button>
      </div>

      <h3>{operation.title}</h3>
      {operation.description && <p>{operation.description}</p>}
      <img className="crew-social-image" src={operation.image_url || FALLBACK_OPERATION_IMAGE} alt="" loading="lazy" />

      <div className="crew-lfg-panel">
        <div className="crew-lfg-topline">
          <span className={`crew-lfg-status ${status}`}>{operationStatusLabel(operation)}</span>
          <span>{operation.event_type || "Crew operation"}</span>
        </div>
        <div className="crew-lfg-details">
          <div><small>Players needed</small><strong>{maxPlayers || 1}</strong></div>
          <div><small>Starts</small><strong>{formatWhen(operation.starts_at)}</strong></div>
          <div><small>Ends</small><strong>{formatWhen(operation.ends_at)}</strong></div>
          <div><small>Platform</small><strong>{operation.platform || "Any"}</strong></div>
        </div>
        <button className="crew-lfg-join" type="button" onClick={onJoin} disabled={joinDisabled}>
          {operation.current_user_joined ? "Leave" : isFull ? "Full" : "Join"}
        </button>
      </div>
    </article>
  );
}
