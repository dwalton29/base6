export function PassportCover({ passportNumber }: { passportNumber?: string | null }) {
  return (
    <div className="b6-passport-cover" aria-label="BASE6 passport cover">
      <div className="b6-passport-cover__inner">
        <span>BASE6</span>
        <div className="b6-passport-cover__seal" aria-hidden="true">✦</div>
        <strong>Passport</strong>
        <small>{passportNumber || "Leonida entry record"}</small>
      </div>
    </div>
  );
}
