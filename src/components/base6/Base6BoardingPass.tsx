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

export function Base6BoardingPass({ details }: { details: Base6BoardingPassDetails }) {
  return (
    <article className="b6-real-boarding-pass" aria-label="BASE6 boarding pass">
      <header className="b6-real-boarding-pass__header">
        <div>
          <strong>BASE6 AIRLINES</strong>
          <span>Passenger ticket and passport check</span>
        </div>
        <div>
          <strong>BOARDING PASS</strong>
          <span>Leonida first class</span>
        </div>
      </header>

      <main className="b6-real-boarding-pass__body">
        <div className="b6-real-boarding-pass__barcode" aria-hidden="true" />

        <section className="b6-real-boarding-pass__passenger">
          <span>Passenger</span>
          <strong>{details.passenger}</strong>
          <small>Passport no. {details.passportNumber}</small>
        </section>

        <section className="b6-real-boarding-pass__route" aria-label="Route">
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

        <section className="b6-real-boarding-pass__fields" aria-label="Flight details">
          <span><small>Flight</small><strong>{details.flight}</strong></span>
          <span><small>Gate</small><strong>{details.gate}</strong></span>
          <span><small>Seat</small><strong>{details.seat}</strong></span>
          <span><small>Arrival</small><strong>{details.arrival}</strong></span>
          <span><small>Departure</small><strong>{details.departure}</strong></span>
          <span><small>Class</small><strong>{details.classType}</strong></span>
        </section>

        <aside className="b6-real-boarding-pass__stub" aria-label="Ticket stub">
          <strong>BASE6</strong>
          <span>Boarding pass</span>
          <small>{details.passportNumber}</small>
        </aside>
      </main>

      <footer className="b6-real-boarding-pass__footer">Please be at the gate when boarding begins</footer>
    </article>
  );
}
