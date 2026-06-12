"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PassportBook } from "@/components/passport/PassportBook";
import {
  buildPassportIdentityDetails,
  chunkPassportStamps,
  fallbackPassportStamps,
  parsePassportStampRows,
  type PassportProfile,
  type PassportStamp,
  type PassportStampRow,
} from "@/lib/passport";
import { supabase, hasSupabaseEnv } from "@/lib/supabase";

export default function PassportPage() {
  const [profile, setProfile] = useState<PassportProfile | null>(null);
  const [stamps, setStamps] = useState<PassportStamp[]>([]);
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

      setProfile(profileData as PassportProfile);

      const { data: stampData } = await supabase
        .from("user_passport_stamps")
        .select("granted_at, passport_stamps(name, description, icon, code)")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: true });

      const parsedStamps = parsePassportStampRows(stampData as PassportStampRow[] | null);
      setStamps(parsedStamps.length ? parsedStamps : fallbackPassportStamps);
      setIsLoading(false);
    }

    loadPassport();
  }, []);

  const stampPages = useMemo(() => chunkPassportStamps(stamps), [stamps]);
  const totalPages = 1 + stampPages.length;
  const identityDetails = profile ? buildPassportIdentityDetails(profile) : null;

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

  return (
    <div className="b6-passport-page">
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

      {!isLoading && profile && identityDetails && (
        <PassportBook
          passportNumber={profile.passport_number}
          identityDetails={identityDetails}
          stampPages={stampPages}
          pageIndex={pageIndex}
          totalPages={totalPages}
          hasOpened={hasOpened}
          isTurning={isTurning}
          turnDirection={turnDirection}
          onPrevious={() => turnPage("previous")}
          onNext={() => turnPage("next")}
          onOpenPage={setPageIndex}
        />
      )}
    </div>
  );
}
