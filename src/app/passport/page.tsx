"use client";

import Link from "next/link";
import { Base6PassportCover, Base6PassportIdentityPage } from "@/components/base6/PassportDesign";
import { useEffect, useMemo, useState } from "react";
import { supabase, hasSupabaseEnv } from "@/lib/supabase";

type Profile = {
  username: string;
  passport_number: string;
  platform: string | null;
  platform_handle: string | null;
  avatar_url: string | null;
  crime_history: string | null;
  san_andreas_since_year: number | null;
  business_type: string | null;
  business_custom_text: string | null;
  bio: string | null;
  reputation_score: number;
  created_at?: string | null;
};

type Stamp = {
  name: string;
  description: string | null;
  icon: string | null;
  code?: string | null;
  granted_at?: string | null;
};

type StampRow = {
  granted_at: string | null;
  passport_stamps:
    | {
        name: string;
        description: string | null;
        icon: string | null;
        code: string | null;
      }
    | {
        name: string;
        description: string | null;
        icon: string | null;
        code: string | null;
      }[]
    | null;
};

const fallbackStamps: Stamp[] = [
  {
    name: "Checked In",
    description: "Issued your first Leonida boarding pass.",
    icon: "✈️",
    code: "checked_in",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getPlatformLabel(platform?: string | null) {
  if (!platform) return "Player ID";
  if (platform.includes("PlayStation")) return "PSN";
  if (platform.includes("Xbox")) return "Gamertag";
  if (platform.includes("Steam") || platform.includes("PC")) return "Steam";
  return "Player ID";
}

export default function PassportPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [hasOpened, setHasOpened] = useState(false);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous" | null>(null);
  const [isTurning, setIsTurning] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHasOpened(true), 550);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadPassport() {
      if (!hasSupabaseEnv || !supabase) {
        setMessage("Add your Supabase env vars to load real passports.");
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setMessage("No passport signed in yet.");
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username, passport_number, platform, platform_handle, avatar_url, crime_history, san_andreas_since_year, business_type, business_custom_text, bio, reputation_score, created_at")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setMessage(profileError.message);
        setIsLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      const { data: stampData } = await supabase
        .from("user_passport_stamps")
        .select("granted_at, passport_stamps(name, description, icon, code)")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: true });

      const parsedStamps = ((stampData as StampRow[] | null) || [])
        .map((row) => {
          const stamp = Array.isArray(row.passport_stamps) ? row.passport_stamps[0] : row.passport_stamps;
          if (!stamp) return null;
          return {
            name: stamp.name,
            description: stamp.description,
            icon: stamp.icon,
            code: stamp.code,
            granted_at: row.granted_at,
          };
        })
        .filter(Boolean) as Stamp[];

      setStamps(parsedStamps.length ? parsedStamps : fallbackStamps);
      setIsLoading(false);
    }

    loadPassport();
  }, []);

  const business = profile?.business_custom_text || profile?.business_type || "Lounge traveller";
  const record = profile?.crime_history === "Spent time in San Andreas"
    ? `San Andreas · moved there in ${profile.san_andreas_since_year || 2013}`
    : profile?.crime_history || "Clean record";
  const issueDate = formatDate(profile?.created_at);
  const passportIdentityDetails = profile ? {
    username: profile.username,
    passportNumber: profile.passport_number,
    avatarUrl: profile.avatar_url,
    platform: profile.platform,
    handleLabel: getPlatformLabel(profile.platform),
    handle: profile.platform_handle,
    issued: issueDate,
    record,
    business,
    bio: profile.bio,
    reputation: profile.reputation_score,
  } : null;

  const stampPages = useMemo(() => {
    const source = stamps.length ? stamps : fallbackStamps;
    const chunks: Stamp[][] = [];
    for (let i = 0; i < source.length; i += 6) chunks.push(source.slice(i, i + 6));
    return chunks.length ? chunks : [fallbackStamps];
  }, [stamps]);

  const totalPages = 1 + stampPages.length;
  const currentStampPage = pageIndex > 0 ? stampPages[pageIndex - 1] : [];

  function turnPage(direction: "next" | "previous") {
    if (isTurning) return;
    const nextIndex = direction === "next" ? pageIndex + 1 : pageIndex - 1;
    if (nextIndex < 0 || nextIndex > totalPages - 1) return;

    setTurnDirection(direction);
    setIsTurning(true);

    window.setTimeout(() => setPageIndex(nextIndex), 170);
    window.setTimeout(() => {
      setIsTurning(false);
      setTurnDirection(null);
    }, 520);
  }

  const goPrevious = () => turnPage("previous");
  const goNext = () => turnPage("next");

  return (
    <div className="page passport-page-shell">
      {isLoading && (
        <section className="card stack">
          <span className="eyebrow">Passport control</span>
          <p className="copy">Checking documents...</p>
        </section>
      )}

      {!isLoading && !profile && (
        <section className="card stack">
          <span className="eyebrow">No active passport</span>
          <h2 className="h2">{message}</h2>
          <Link className="button primary" href="/signup">Check in for Leonida</Link>
        </section>
      )}

      {!isLoading && profile && (
        <section className={`passport-book-stage ${hasOpened ? "is-open" : "is-closed"}`}>
          <div className="passport-closed-cover" aria-hidden="true">
            <Base6PassportCover passportNumber={profile.passport_number} />
          </div>

          <div className={`passport-book ${hasOpened ? "open" : ""}`}>
            <article
              className={`passport-paper-page ${isTurning ? `is-turning ${turnDirection === "next" ? "turn-next" : "turn-previous"}` : ""}`}
              key={pageIndex}
            >
              <div className="passport-page-topline">
                <span className="eyebrow">{pageIndex === 0 ? "Passenger details" : `Stamp page ${pageIndex}`}</span>
                <span className="passport-page-number">{pageIndex + 1}/{totalPages}</span>
              </div>

              {pageIndex === 0 && passportIdentityDetails ? (
                <div className="base6-open-passport-spread passport-directory-spread">
                  <Base6PassportIdentityPage details={passportIdentityDetails} />
                </div>
              ) : (
                <div className="passport-stamp-sheet">
                  <div className="passport-stamp-intro">
                    <h2>Collected stamps</h2>
                    <p>Pages fill up as you check in, join crews, attend meets, post sessions, and build your Leonida record.</p>
                  </div>

                  <div className="passport-stamp-grid-book">
                    {currentStampPage.map((stamp, index) => (
                      <div className="passport-book-stamp" key={`${stamp.name}-${index}`}>
                        <span className="stamp-icon">{stamp.icon || "✦"}</span>
                        <strong>{stamp.name}</strong>
                        <p>{stamp.description || "Stamped into your travel record."}</p>
                        <small>{formatDate(stamp.granted_at)}</small>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 6 - currentStampPage.length) }).map((_, index) => (
                      <div className="passport-book-stamp empty" key={`empty-${index}`}>
                        <span className="stamp-icon">＋</span>
                        <strong>Empty slot</strong>
                        <p>Earn another stamp to fill this page.</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>

          <div className="passport-book-controls">
            <button className="button" type="button" onClick={goPrevious} disabled={pageIndex === 0}>← Previous page</button>
            <div className="passport-page-dots" aria-label="Passport pages">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  className={index === pageIndex ? "active" : ""}
                  type="button"
                  onClick={() => setPageIndex(index)}
                  aria-label={`Open passport page ${index + 1}`}
                />
              ))}
            </div>
            <button className="button primary" type="button" onClick={goNext} disabled={pageIndex === totalPages - 1}>Next page →</button>
          </div>

        </section>
      )}
    </div>
  );
}
