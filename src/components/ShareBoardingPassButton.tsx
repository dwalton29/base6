"use client";

import { useState } from "react";

export default function ShareBoardingPassButton() {
  const [copied, setCopied] = useState(false);

  async function shareBoardingPass() {
    const url = `${window.location.origin}/passport`;
    const title = "BASE6 Boarding Pass";
    const text = "I checked in for Leonida on BASE6.";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // User cancelled the native share sheet; no error needs showing.
    }
  }

  return (
    <button className="button checkin-share-button" type="button" onClick={shareBoardingPass}>
      {copied ? "Copied" : "Share Boarding Pass"}
    </button>
  );
}
