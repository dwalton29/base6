import Link from "next/link";

export default function CheckInPage() {
  return (
    <main className="checkin-screen" aria-label="BASE6 passport check-in">
      <div className="checkin-noise" aria-hidden="true" />
      <section className="checkin-panel">
        <div className="checkin-kicker">BASE6 · LEONIDA DEPARTURES</div>
        <h1>Get your Leonida Passport</h1>
        <p>
          Your pre-launch check-in for crews, sessions, stamps and reputation before the gates open.
        </p>
        <div className="checkin-actions">
          <Link className="button primary checkin-board-button" href="/signup">
            Board Flight
          </Link>
          <Link className="checkin-text-link" href="/lounge">
            Enter lounge as guest
          </Link>
        </div>
      </section>
    </main>
  );
}
