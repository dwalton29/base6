export type BoardingPassDetails = {
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

export type BoardingPassVariant = "print" | "peek" | "horizontal";

export function Base6BoardingPass({
  details,
  variant = "horizontal",
}: {
  details: BoardingPassDetails;
  variant?: BoardingPassVariant;
}) {
  return (
    <article className={`base6-pass-frame base6-pass-frame--${variant}`} aria-label="BASE6 boarding pass">
      <div className="base6-pass-art">
        <div className="base6-pass-header">
          <div>
            <strong>BASE6 AIRLINES</strong>
            <span>Passenger ticket and passport check</span>
          </div>
          <div>
            <strong>BOARDING PASS</strong>
            <span>Leonida first class</span>
          </div>
        </div>

        <div className="base6-pass-body">
          <div className="base6-pass-barcode" aria-hidden="true" />

          <div className="base6-pass-passenger">
            <span>Passenger</span>
            <strong>{details.passenger}</strong>
            <small>Passport no. {details.passportNumber}</small>
          </div>

          <div className="base6-pass-route">
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
          </div>

          <div className="base6-pass-fields">
            <span><small>Flight</small><strong>{details.flight}</strong></span>
            <span><small>Gate</small><strong>{details.gate}</strong></span>
            <span><small>Seat</small><strong>{details.seat}</strong></span>
            <span><small>Arrival</small><strong>{details.arrival}</strong></span>
            <span><small>Departure</small><strong>{details.departure}</strong></span>
            <span><small>Class</small><strong>{details.classType}</strong></span>
          </div>

          <div className="base6-pass-stub">
            <strong>BASE6</strong>
            <span>Boarding pass</span>
            <small>{details.passportNumber}</small>
          </div>
        </div>

        <div className="base6-pass-footer">Please be at the gate when boarding begins</div>
      </div>
    </article>
  );
}
