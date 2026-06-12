import { PassportCover } from "./PassportCover";
import { PassportIdentityPage } from "./PassportIdentityPage";
import { PassportStampPage } from "./PassportStampPage";
import type { PassportIdentityDetails, PassportStamp } from "@/lib/passport";

type PassportBookProps = {
  passportNumber: string;
  identityDetails: PassportIdentityDetails;
  stampPages: PassportStamp[][];
  pageIndex: number;
  totalPages: number;
  hasOpened: boolean;
  isTurning: boolean;
  turnDirection: "next" | "previous" | null;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPage: (pageIndex: number) => void;
};

export function PassportBook({
  passportNumber,
  identityDetails,
  stampPages,
  pageIndex,
  totalPages,
  hasOpened,
  isTurning,
  turnDirection,
  onPrevious,
  onNext,
  onOpenPage,
}: PassportBookProps) {
  const currentStampPage = pageIndex > 0 ? stampPages[pageIndex - 1] || [] : [];

  return (
    <section className={`b6-passport-stage ${hasOpened ? "is-open" : "is-closed"}`}>
      <div className="b6-passport-stage__cover" aria-hidden="true">
        <PassportCover passportNumber={passportNumber} />
      </div>

      <div className={`b6-passport-book ${hasOpened ? "is-open" : ""}`}>
        <article
          className={`b6-passport-paper ${isTurning ? `is-turning ${turnDirection === "next" ? "turn-next" : "turn-previous"}` : ""}`}
          key={pageIndex}
        >
          <div className="b6-passport-paper__topline">
            <span className="eyebrow">{pageIndex === 0 ? "Passenger details" : `Stamp page ${pageIndex}`}</span>
            <span className="b6-passport-paper__page-number">{pageIndex + 1}/{totalPages}</span>
          </div>

          {pageIndex === 0 ? (
            <PassportIdentityPage details={identityDetails} />
          ) : (
            <PassportStampPage stamps={currentStampPage} />
          )}
        </article>
      </div>

      <div className="b6-passport-controls">
        <button className="button" type="button" onClick={onPrevious} disabled={pageIndex === 0}>← Previous page</button>
        <div className="b6-passport-dots" aria-label="Passport pages">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              className={index === pageIndex ? "active" : ""}
              type="button"
              onClick={() => onOpenPage(index)}
              aria-label={`Open passport page ${index + 1}`}
            />
          ))}
        </div>
        <button className="button primary" type="button" onClick={onNext} disabled={pageIndex === totalPages - 1}>Next page →</button>
      </div>
    </section>
  );
}
