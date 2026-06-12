import { cleanPassportMachineText, passportInitials, type PassportIdentityDetails } from "@/lib/passport";

export function PassportIdentityPage({ details }: { details: PassportIdentityDetails }) {
  const username = details.username || "Passenger";
  const serialLine = `B6<${cleanPassportMachineText(username)}<<LEONIDA<${cleanPassportMachineText(details.passportNumber)}`;

  return (
    <section className="b6-passport-id" aria-label="Passport holder details">
      <div className="b6-passport-id__topline">
        <span>Leonida Passport</span>
        <strong>Identity page</strong>
      </div>

      <div className="b6-passport-id__hero">
        <div className="b6-passport-id__photo">
          {details.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={details.avatarUrl} alt={`${username} passport photograph`} />
          ) : (
            <span>{passportInitials(username)}</span>
          )}
        </div>

        <div className="b6-passport-id__title">
          <span>Passport holder</span>
          <h1>{username}</h1>
          <p>Issued {details.issued || "today"}</p>
        </div>
      </div>

      <dl className="b6-passport-id__grid">
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
          <dt>Status</dt>
          <dd>{details.record || "Clean record"}</dd>
        </div>
        <div>
          <dt>Business</dt>
          <dd>{details.business || "Lounge traveller"}</dd>
        </div>
      </dl>

      <div className="b6-passport-id__bio">
        <span>Bio</span>
        <p>{details.bio || "No passenger bio supplied yet."}</p>
      </div>

      <div className="b6-passport-id__serial" aria-label="Passport serial number">
        <span>Serial no.</span>
        <strong>{serialLine}</strong>
      </div>
    </section>
  );
}
