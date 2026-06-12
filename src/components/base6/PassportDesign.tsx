export type PassportIdentityDetails = {
  username: string;
  passportNumber: string;
  avatarUrl?: string | null;
  platform?: string | null;
  handleLabel?: string;
  handle?: string | null;
  issued?: string;
  record?: string;
  business?: string;
  bio?: string | null;
  reputation?: string | number | null;
  flight?: string | null;
  seat?: string | null;
};

function initials(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return "ID";
  return trimmed.slice(0, 2).toUpperCase();
}

function cleanMachineText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "") || "PASSENGER";
}

export function Base6PassportCover({ passportNumber }: { passportNumber?: string }) {
  return (
    <div className="base6-passport-cover" aria-label="BASE6 passport cover">
      <div className="base6-passport-cover__inner">
        <span className="base6-passport-cover__country">BASE6</span>
        <div className="base6-passport-cover__seal" aria-hidden="true">✦</div>
        <strong>Passport</strong>
        <small>{passportNumber || "Leonida entry record"}</small>
      </div>
    </div>
  );
}

export function Base6PassportIdentityPage({ details }: { details: PassportIdentityDetails }) {
  const username = details.username || "Passenger";
  const serialLine = `B6<${cleanMachineText(username)}<<LEONIDA<${cleanMachineText(details.passportNumber)}`;

  return (
    <article className="base6-passport-id-page compact" aria-label="Passport holder details">
      <div className="base6-passport-id-page__topline">
        <span>Leonida Passport</span>
        <strong>Identity page</strong>
      </div>

      <div className="base6-passport-id-page__hero">
        <div className="base6-passport-id-page__photo">
          {details.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={details.avatarUrl} alt={`${username} passport photograph`} />
          ) : (
            <span>{initials(username)}</span>
          )}
        </div>

        <div className="base6-passport-id-page__title">
          <span>Passport holder</span>
          <h2>{username}</h2>
          <p>Issued {details.issued || "today"}</p>
        </div>
      </div>

      <dl className="base6-passport-id-page__grid compact">
        <div>
          <dt>Passport no.</dt>
          <dd>{details.passportNumber}</dd>
        </div>
        <div>
          <dt>Issue date</dt>
          <dd>{details.issued || "Pending"}</dd>
        </div>
        <div>
          <dt>Platform</dt>
          <dd>{details.platform || "Pending"}</dd>
        </div>
        <div>
          <dt>{details.handleLabel || "Player ID"}</dt>
          <dd>{details.handle || "Pending"}</dd>
        </div>
        <div>
          <dt>Flight</dt>
          <dd>{details.flight || "Pending"}</dd>
        </div>
        <div>
          <dt>Seat</dt>
          <dd>{details.seat || "Pending"}</dd>
        </div>
      </dl>

      <div className="base6-passport-id-page__serial" aria-label="Passport serial number">
        <span>Serial no.</span>
        <strong>{serialLine}</strong>
      </div>
    </article>
  );
}

export function Base6PassportEntryPage({ issued, stampsCount = 1 }: { issued?: string; stampsCount?: number }) {
  return (
    <article className="base6-passport-entry-page" aria-label="Passport entry record">
      <div className="base6-passport-entry-page__topline">
        <span>Entry record</span>
        <strong>BASE6</strong>
      </div>
      <div className="base6-passport-entry-page__stamp">
        <span>Checked in</span>
        <strong>Leonida</strong>
        <small>{issued || "Issue date pending"}</small>
      </div>
      <div className="base6-passport-entry-page__copy">
        <h3>Passport active</h3>
        <p>Your stamp pages will fill as you post, join crews, attend events and build your Leonida reputation.</p>
      </div>
      <div className="base6-passport-entry-page__mini-grid">
        <span><small>Pages</small><strong>01</strong></span>
        <span><small>Stamps</small><strong>{stampsCount}</strong></span>
      </div>
    </article>
  );
}
