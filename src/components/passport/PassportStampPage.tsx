import { formatPassportDate, type PassportStamp } from "@/lib/passport";

export function PassportStampPage({ stamps }: { stamps: PassportStamp[] }) {
  const slots = Array.from({ length: 6 }, (_, index) => stamps[index] || null);

  return (
    <section className="b6-stamp-page" aria-label="Passport stamp page">
      <div className="b6-stamp-page__grid">
        {slots.map((stamp, index) => (
          stamp ? (
            <article className="b6-passport-stamp" data-slot={index + 1} key={`${stamp.name}-${index}`}>
              <span className="b6-passport-stamp__icon">{stamp.icon || "✦"}</span>
              <strong>{stamp.name}</strong>
              <small>{formatPassportDate(stamp.granted_at)}</small>
              <em>BASE6</em>
            </article>
          ) : (
            <div className="b6-passport-stamp b6-passport-stamp--empty" data-slot={index + 1} key={`empty-${index}`}>
              <span>Awaiting stamp</span>
            </div>
          )
        ))}
      </div>
    </section>
  );
}
