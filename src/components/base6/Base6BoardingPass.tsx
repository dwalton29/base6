export type Base6BoardingPassDetails = {
  passenger: string;
  passportNumber: string;
  platform: string;
  handle: string;
  from: string;
  to: string;
  flight: string;
  gate: string;
  seat: string;
  classType: string;
  arrival: string;
  departure: string;
};

type Base6BoardingPassVariant = "paper" | "peek" | "flat" | "print" | "vertical" | "horizontal";

type Base6BoardingPassProps = {
  details: Base6BoardingPassDetails;
  /**
   * Accepted only so older signup wrappers do not break TypeScript.
   * The pass intentionally ignores this: one ticket object, wrapper handles placement.
   */
  variant?: Base6BoardingPassVariant;
  className?: string;
};

export function Base6BoardingPass({ details, className }: Base6BoardingPassProps) {
  const passClassName = ["base6-single-boarding-pass", className].filter(Boolean).join(" ");

  return (
    <article className={passClassName} aria-label="BASE6 boarding pass">
      <header className="base6-single-boarding-pass__header">
        <div className="base6-single-boarding-pass__brand">
          <strong>BASE6 AIRLINES</strong>
          <span>Passenger ticket and passport check</span>
        </div>
        <div className="base6-single-boarding-pass__title">
          <strong>BOARDING PASS</strong>
          <span>Leonida first class</span>
        </div>
      </header>

      <main className="base6-single-boarding-pass__body">
        <div className="base6-single-boarding-pass__barcode" aria-hidden="true" />

        <section className="base6-single-boarding-pass__passenger">
          <span>Passenger</span>
          <strong>{details.passenger}</strong>
          <small>Passport no. {details.passportNumber}</small>
        </section>

        <section className="base6-single-boarding-pass__route" aria-label="Route">
          <div>
            <span>From</span>
            <strong>{details.from}</strong>
          </div>
          <div>
            <span>To</span>
            <strong>{details.to}</strong>
          </div>
          <div>
            <span>Terminal</span>
            <strong>{details.platform}</strong>
          </div>
        </section>

        <section className="base6-single-boarding-pass__fields" aria-label="Flight details">
          <div><span>Flight</span><strong>{details.flight}</strong></div>
          <div><span>Gate</span><strong>{details.gate}</strong></div>
          <div><span>Seat</span><strong>{details.seat}</strong></div>
          <div><span>Arrival</span><strong>{details.arrival}</strong></div>
          <div><span>Depart</span><strong>{details.departure}</strong></div>
          <div><span>Class</span><strong>{details.classType}</strong></div>
        </section>

        <aside className="base6-single-boarding-pass__stub" aria-label="Ticket stub">
          <strong>BASE6</strong>
          <span>Boarding pass</span>
          <small>{details.passportNumber}</small>
        </aside>
      </main>

      <footer className="base6-single-boarding-pass__footer">Please be at the gate when boarding begins</footer>
    </article>
  );
}
