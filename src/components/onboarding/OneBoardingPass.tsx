export type OnboardingBoardingPassDetails = {
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

export function OneBoardingPass({ details }: { details: OnboardingBoardingPassDetails }) {
  return (
    <article className="one-boarding-pass" aria-label="BASE6 boarding pass">
      <div className="one-pass-header">
        <div>
          <strong>BASE6 AIRLINES</strong>
          <span>Passenger ticket and passport check</span>
        </div>
        <div>
          <strong>BOARDING PASS</strong>
          <span>Leonida first class</span>
        </div>
      </div>

      <div className="one-pass-body">
        <div className="one-pass-barcode" aria-hidden="true" />

        <div className="one-pass-passenger">
          <span>Passenger</span>
          <strong>{details.passenger}</strong>
          <small>Passport no. {details.passportNumber}</small>
        </div>

        <div className="one-pass-route">
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

        <div className="one-pass-fields">
          <span><small>Flight</small><strong>{details.flight}</strong></span>
          <span><small>Gate</small><strong>{details.gate}</strong></span>
          <span><small>Seat</small><strong>{details.seat}</strong></span>
          <span><small>Arrival</small><strong>{details.arrival}</strong></span>
          <span><small>Departure</small><strong>{details.departure}</strong></span>
          <span><small>Class</small><strong>{details.classType}</strong></span>
        </div>

        <div className="one-pass-stub">
          <strong>BASE6</strong>
          <span>Boarding pass</span>
          <small>{details.passportNumber}</small>
        </div>
      </div>

      <div className="one-pass-footer">Please be at the gate when boarding begins</div>
    </article>
  );
}
