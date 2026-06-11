import Link from "next/link";

export default function CheckInPage() {
  return (
    <main className="checkin-screen" aria-label="BASE6 passport check-in">
      <div className="checkin-noise" aria-hidden="true" />

      <section className="checkin-panel compact-boarding-panel">
        <div className="checkin-kicker">BASE6 · LEONIDA DEPARTURES</div>
        <h1>Boarding Screen</h1>
        <p>
          Check in for Leonida, build your passport and keep your place in the lounge before the gates open.
        </p>

        <div className="departure-notice" aria-label="Flights to Leonida Now Boarding">
          <div className="departure-notice-track" aria-hidden="true">
            <span>Flights to Leonida Now Boarding</span>
            <span>Flights to Leonida Now Boarding</span>
            <span>Flights to Leonida Now Boarding</span>
            <span>Flights to Leonida Now Boarding</span>
          </div>
        </div>

        <div className="checkin-actions checkin-primary-stack">
          <Link className="button primary checkin-board-button" href="/signup">
            Board Flight
          </Link>
          <Link className="checkin-login-link" href="/login">
            Login
          </Link>
        </div>
      </section>

      <section className="checkin-beneath" aria-label="BASE6 sections">
        <Link className="checkin-content-card" href="/news">
          <span>NEWS</span>
          <strong>Leonida Wire</strong>
          <p>Official drops, videos and community updates.</p>
        </Link>
        <Link className="checkin-content-card" href="/social">
          <span>SOCIAL</span>
          <strong>Community Feed</strong>
          <p>Post theories, crews, LFGs and GTA V / VI chat.</p>
        </Link>
        <Link className="checkin-content-card" href="/crews">
          <span>CREWS</span>
          <strong>Find Your Team</strong>
          <p>Start building your circle before launch.</p>
        </Link>
      </section>
    </main>
  );
}
