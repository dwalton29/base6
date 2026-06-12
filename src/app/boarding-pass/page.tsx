"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OneBoardingPass, type OnboardingBoardingPassDetails } from "@/components/onboarding/OneBoardingPass";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

type BoardingPassProfile = {
  id: string;
  username: string;
  passport_number: string;
  platform: string | null;
  platform_handle: string | null;
  boarding_flight: string | null;
  boarding_seat: string | null;
  created_at: string | null;
};

const PROFILE_SELECT = "id, username, passport_number, platform, platform_handle, boarding_flight, boarding_seat, created_at";

function formatIssueDate(value: string | null) {
  if (!value) return "CHECKED IN";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "CHECKED IN";

  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    .format(date)
    .replace(/ /g, " ")
    .toUpperCase();
}

function getBoardingPassDetails(profile: BoardingPassProfile): OnboardingBoardingPassDetails {
  return {
    passenger: profile.username || "Passenger",
    passportNumber: profile.passport_number || "B6-LND-PENDING",
    platform: profile.platform || "BASE6",
    handle: profile.platform_handle || profile.username || "Passenger",
    from: "BASE6 LOUNGE",
    to: "LEONIDA INTL",
    flight: profile.boarding_flight || "A-00",
    gate: "VI",
    seat: profile.boarding_seat || "TBC",
    classType: "FIRST",
    arrival: formatIssueDate(profile.created_at),
    departure: "19 NOV 26 00:00",
  };
}

export default function BoardingPassPage() {
  const [profile, setProfile] = useState<BoardingPassProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    async function loadBoardingPass() {
      if (!hasSupabaseEnv || !supabase) {
        setMessage("Add your Supabase env vars to load your boarding pass.");
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          setMessage("Log in to view your boarding pass.");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_SELECT)
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfile(data as BoardingPassProfile);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load your boarding pass.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBoardingPass();
  }, []);

  const details = useMemo(() => profile ? getBoardingPassDetails(profile) : null, [profile]);

  async function shareBoardingPass() {
    if (!profile) return;

    const url = `${window.location.origin}/boarding-pass`;
    const text = `${profile.username} has checked in for Leonida on BASE6. Flight ${profile.boarding_flight || "A-00"}, Seat ${profile.boarding_seat || "TBC"}.`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "BASE6 Boarding Pass", text, url });
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareStatus("Copied share text.");
      window.setTimeout(() => setShareStatus(""), 1800);
    } catch {
      // Native share was cancelled.
    }
  }

  function printBoardingPass() {
    window.print();
  }

  return (
    <div className="page stack boarding-pass-page">
      {isLoading ? (
        <section className="card stack">
          <span className="eyebrow">Boarding pass</span>
          <p className="copy">Retrieving travel document...</p>
        </section>
      ) : null}

      {!isLoading && !profile ? (
        <section className="card stack">
          <span className="eyebrow">No active boarding pass</span>
          <h1 className="h2">{message}</h1>
          <div className="button-row">
            <Link className="button primary" href="/login">Log in</Link>
            <Link className="button" href="/signup">Check in</Link>
          </div>
        </section>
      ) : null}

      {!isLoading && profile && details ? (
        <>
          <section className="boarding-pass-header card">
            <div>
              <span className="eyebrow">Boarding pass</span>
              <h1 className="h2">{profile.boarding_flight || "A-00"} · Seat {profile.boarding_seat || "TBC"}</h1>
              <p className="copy">Keep this with your passport. Share it, print it, or jump straight to your cabin map.</p>
            </div>
            <div className="boarding-pass-header__meta">
              <span>Destination</span>
              <strong>Leonida</strong>
            </div>
          </section>

          <section className="boarding-pass-stage card" aria-label="Your BASE6 boarding pass">
            <div className="boarding-pass-ticket-wrap">
              <OneBoardingPass details={details} />
            </div>
          </section>

          <section className="boarding-pass-actions card">
            <button className="button primary" type="button" onClick={shareBoardingPass}>Share</button>
            <button className="button" type="button" onClick={printBoardingPass}>Print</button>
            <Link className="button" href="/passport">See Passport</Link>
            <Link className="button" href="/flight">See Flight</Link>
          </section>

          {shareStatus ? <p className="copy faint boarding-pass-share-status">{shareStatus}</p> : null}
        </>
      ) : null}
    </div>
  );
}
