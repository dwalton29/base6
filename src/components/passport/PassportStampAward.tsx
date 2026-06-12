"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BASE6_PASSPORT_STAMP_EVENT,
  takeQueuedPassportStampAwards,
  type PassportStampAwardDetail,
} from "@/lib/passportStampEvents";

type StampStage = "closed" | "opening" | "stamping" | "stamped";

function formatStampDate(value?: string) {
  if (!value) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date());
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function PassportStampAward() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<PassportStampAwardDetail[]>([]);
  const [activeStamp, setActiveStamp] =
    useState<PassportStampAwardDetail | null>(null);
  const [stage, setStage] = useState<StampStage>("closed");

  useEffect(() => {
    function handleStampAward(event: Event) {
      const detail = (event as CustomEvent<PassportStampAwardDetail>).detail;
      if (!detail?.title) return;
      setQueue((current) => [...current, detail]);
    }

    window.addEventListener(
      BASE6_PASSPORT_STAMP_EVENT,
      handleStampAward as EventListener,
    );
    return () =>
      window.removeEventListener(
        BASE6_PASSPORT_STAMP_EVENT,
        handleStampAward as EventListener,
      );
  }, []);

  useEffect(() => {
    if (pathname !== "/lounge") return;

    const timer = window.setTimeout(() => {
      const queuedStamps = takeQueuedPassportStampAwards();
      if (queuedStamps.length > 0) {
        setQueue((current) => [...current, ...queuedStamps]);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (activeStamp || queue.length === 0) return;

    const [nextStamp, ...remaining] = queue;
    setActiveStamp(nextStamp);
    setQueue(remaining);
    setStage("closed");
  }, [activeStamp, queue]);

  useEffect(() => {
    if (!activeStamp) return;

    const openTimer = window.setTimeout(() => setStage("opening"), 280);
    const stampTimer = window.setTimeout(() => setStage("stamping"), 940);
    const stampedTimer = window.setTimeout(() => setStage("stamped"), 1540);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(stampTimer);
      window.clearTimeout(stampedTimer);
    };
  }, [activeStamp]);

  const stampDate = useMemo(
    () => formatStampDate(activeStamp?.date),
    [activeStamp?.date],
  );

  function dismissStamp() {
    setActiveStamp(null);
    setStage("closed");
  }

  if (!activeStamp) return null;

  return (
    <div
      className={`passport-stamp-award-overlay stage-${stage}`}
      role="dialog"
      aria-modal="true"
      aria-label="Passport stamp awarded"
    >
      <div className="passport-stamp-award-card">
        <div className="passport-stamp-award-copy">
          <span className="eyebrow">Passport updated</span>
          <h2>You've earnt a new Stamp on your passport</h2>
          <p>
            {activeStamp.description ||
              "Your Leonida Passport has been updated."}
          </p>
        </div>

        <div className="passport-stamp-award-book" aria-hidden="true">
          <div className="passport-stamp-award-cover">
            <span>BASE6</span>
            <strong>Passport</strong>
            <small>Leonida entry record</small>
          </div>

          <div className="passport-stamp-award-pages single">
            <div className="passport-stamp-award-page left">
              <span className="passport-stamp-award-page-label">
                Entry confirmed
              </span>

              <div className="passport-stamp-award-imprint">
                <span>{activeStamp.icon || "✦"}</span>
                <strong>{activeStamp.title}</strong>
                <small>{stampDate}</small>
              </div>

              <div className="passport-stamp-award-press">
                <span>BASE6</span>
              </div>
            </div>
          </div>
        </div>

        <button
          className="button primary passport-stamp-award-button"
          type="button"
          onClick={dismissStamp}
        >
          {stage === "stamped" ? "Continue" : "Skip animation"}
        </button>
      </div>
    </div>
  );
}
