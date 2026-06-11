"use client";

import Link from "next/link";
import { Base6BoardingPass } from "@/components/base6/Base6BoardingPass";
import { Base6PassportCover, Base6PassportIdentityPage } from "@/components/base6/PassportDesign";
import { supabase, hasSupabaseEnv } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { CSSProperties, PointerEvent } from "react";
import { useMemo, useState } from "react";

type SignupForm = {
  username: string;
  profileImage: string;
  platform: string;
  handle: string;
  crimeHistory: string;
  sanAndreasYear: string;
  business: string;
  businessCustom: string;
  bio: string;
  email: string;
  password: string;
};

const initialForm: SignupForm = {
  username: "",
  profileImage: "",
  platform: "",
  handle: "",
  crimeHistory: "",
  sanAndreasYear: "2013",
  business: "",
  businessCustom: "",
  bio: "",
  email: "",
  password: "",
};

function getPlatformLabel(platform: string) {
  if (platform.includes("PlayStation")) return "PSN";
  if (platform.includes("Xbox")) return "Gamertag";
  if (platform.includes("Steam") || platform.includes("PC")) return "Steam";
  return "Gamertag / PSN / Steam";
}

const steps = [
  {
    key: "username",
    eyebrow: "Check-in 1 · Passenger name",
    title: "Hi, there! Checking in for your flight to Leonida? What’s your name?",
    copy: "This is your site username — the name printed onto your Leonida Passport and boarding pass.",
    placeholder: "Your site username",
    type: "text",
  },
  {
    key: "profileImage",
    eyebrow: "Check-in 2 · Photo ID",
    title: "We need some ID for the boarding pass.",
    copy: "Upload a profile picture for your Leonida Passport. You can use an avatar, logo, selfie, car shot — whatever feels like you.",
    type: "photo",
  },
  {
    key: "platform",
    eyebrow: "Check-in 3 · Departure platform",
    title: "What terminal are you arriving from?",
    copy: "Pick the platform you’ll mostly be boarding from when GTA 6 opens the gates.",
    type: "platform",
  },
  {
    key: "handle",
    eyebrow: "Check-in 4 · Player ID",
    title: "What’s your player ID?",
    copy: "This is the handle that will appear on your Leonida Passport.",
    placeholder: "Gamertag / PSN / Steam",
    type: "text",
  },
  {
    key: "crimeHistory",
    eyebrow: "Check-in 5 · Declaration",
    title: "Any crimes to declare?",
    copy: "Have you spent time in San Andreas before, or is Leonida your first offence? Customs has to ask.",
    type: "choice",
    options: ["Spent time in San Andreas", "No previous record"],
  },
  {
    key: "business",
    eyebrow: "Check-in 6 · Reason for travel",
    title: "What’s your business in Leonida?",
    copy: "Vacation, car meets, crew hunting — or write your own reason for travel.",
    type: "business",
    options: ["Vacation", "Car meets", "Looking for a crew"],
  },

  {
    key: "email",
    eyebrow: "Passport security · Account details",
    title: "Where should we send your travel documents?",
    copy: "Add an email and password so your Leonida Passport can be saved to your base6 account.",
    type: "auth",
  },
  {
    key: "bio",
    eyebrow: "Final check · Passport note",
    title: "Anything others should know about you?",
    copy: "Add a short intro for your passport. Keep it casual — who you are, what you’re into, or what you’re looking for.",
    placeholder: "Example: chill player, here for car meets, clips and finding a solid crew.",
    type: "textarea",
  },
] as const;

type SignupPhase = "details" | "fading" | "ticket" | "showcase" | "leaving";

export default function SignupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SignupPhase>("details");
  const [isTearing, setIsTearing] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const [tearStartX, setTearStartX] = useState<number | null>(null);
  const [ticketReady, setTicketReady] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [isScanningId, setIsScanningId] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [authError, setAuthError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [checkInDate] = useState(() => new Date());
  const [stepIndex, setStepIndex] = useState(0);
  const [transitionKey, setTransitionKey] = useState(0);

  const step = steps[stepIndex];
  const totalSteps = steps.length;
  const platformLabel = getPlatformLabel(form.platform);
  const dynamicTitle = step.key === "platform" && form.username.trim()
    ? `What platform is ${form.username.trim()} from?`
    : step.key === "handle"
      ? `What’s your ${platformLabel}?`
      : step.title;
  const dynamicCopy = step.key === "handle"
    ? `This is the ${platformLabel} that will appear on your Leonida Passport.`
    : step.copy;
  const dynamicPlaceholder = step.key === "handle" ? platformLabel : "placeholder" in step ? step.placeholder : "";
  const isLastStep = stepIndex === totalSteps - 1;
  const value = form[step.key as keyof SignupForm];
  const businessReason = form.businessCustom.trim() || form.business;
  const currentYear = new Date().getFullYear();
  const sanAndreasYears = Array.from({ length: currentYear - 2013 + 1 }, (_, index) => String(2013 + index));
  const declaredSanAndreas = form.crimeHistory === "Spent time in San Andreas";
  const recordLabel = declaredSanAndreas
    ? `Spent time in San Andreas · moved there in ${form.sanAndreasYear || "2013"}`
    : form.crimeHistory;
  const canContinue = step.key === "business"
    ? businessReason.trim().length > 0
    : step.key === "crimeHistory"
      ? form.crimeHistory.trim().length > 0 && (!declaredSanAndreas || form.sanAndreasYear.trim().length > 0)
      : step.key === "email"
        ? form.email.trim().includes("@") && form.password.length >= 6
        : value.trim().length > 0;
  const progress = useMemo(() => Math.round(((stepIndex + 1) / totalSteps) * 100), [stepIndex, totalSteps]);

  const arrivalStamp = useMemo(() => checkInDate.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "").toUpperCase(), [checkInDate]);
  const passportIssueDate = useMemo(() => checkInDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), [checkInDate]);

  const passportNumber = useMemo(() => {
    const source = `${form.username || "GUEST"}-${form.platform || "BASE6"}`;
    let total = 0;
    for (let index = 0; index < source.length; index += 1) {
      total += source.charCodeAt(index) * (index + 17);
    }
    return `B6-LND-${String(total % 1000000).padStart(6, "0")}`;
  }, [form.platform, form.username]);


  function updateField(key: string, nextValue: string) {
    setAuthError("");
    setForm((current) => ({ ...current, [key]: nextValue }));
  }

  function updateProfileImage(file: File | null) {
    if (!file) return;
    setAvatarFile(file);
    setIsScanningId(true);
    const scanStartedAt = Date.now();
    const minimumScanTime = 850;
    const finishScan = () => {
      const elapsed = Date.now() - scanStartedAt;
      window.setTimeout(() => setIsScanningId(false), Math.max(minimumScanTime - elapsed, 0));
    };

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField("profileImage", reader.result);
      }
      finishScan();
    };
    reader.onerror = finishScan;
    reader.readAsDataURL(file);
  }

  function goTo(nextIndex: number) {
    setStepIndex(nextIndex);
    setTransitionKey((current) => current + 1);
  }

  function nextStep() {
    if (!canContinue) return;
    if (!isLastStep) goTo(stepIndex + 1);
  }

  function previousStep() {
    if (phase !== "details") return;
    if (stepIndex > 0) goTo(stepIndex - 1);
  }

  async function dataUrlToBlob(dataUrl: string) {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  async function createBase6Account() {
    setAuthError("");

    if (!hasSupabaseEnv || !supabase) {
      setAuthError("Add your Supabase URL and anon key to .env.local before creating real passports.");
      return false;
    }

    setIsCreatingAccount(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            username: form.username.trim(),
            passport_number: passportNumber,
          },
        },
      });

      if (signUpError) throw signUpError;

      const user = authData.user;
      if (!user) {
        throw new Error("Supabase did not return a user. Check your auth provider settings.");
      }

      let avatarUrl = form.profileImage || null;

      if (form.profileImage) {
        const blob = avatarFile ?? await dataUrlToBlob(form.profileImage);
        const extension = avatarFile?.name.split(".").pop()?.toLowerCase() || blob.type.split("/")[1] || "jpg";
        const filePath = `${user.id}/passport-photo-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: blob.type || "image/jpeg",
        });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        username: form.username.trim(),
        passport_number: passportNumber,
        platform: form.platform,
        platform_handle: form.handle.trim(),
        avatar_url: avatarUrl,
        crime_history: form.crimeHistory,
        san_andreas_since_year: declaredSanAndreas ? Number(form.sanAndreasYear || "2013") : null,
        business_type: form.business || null,
        business_custom_text: form.businessCustom.trim() || null,
        bio: form.bio.trim(),
      });

      if (profileError) throw profileError;

      const stampCodes = declaredSanAndreas ? ["checked_in", "san_andreas_veteran"] : ["checked_in"];
      const { data: stampRows, error: stampLookupError } = await supabase
        .from("passport_stamps")
        .select("id, code")
        .in("code", stampCodes);

      if (stampLookupError) throw stampLookupError;

      if (stampRows?.length) {
        const { error: stampInsertError } = await supabase.from("user_passport_stamps").upsert(
          stampRows.map((stamp) => ({ user_id: user.id, stamp_id: stamp.id })),
          { onConflict: "user_id,stamp_id" }
        );
        if (stampInsertError) throw stampInsertError;
      }

      if (avatarUrl && avatarUrl !== form.profileImage) {
        setForm((current) => ({ ...current, profileImage: avatarUrl }));
      }

      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not issue boarding pass.");
      return false;
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function printBoardingPass() {
    if (!canContinue || isCreatingAccount) return;
    const created = await createBase6Account();
    if (!created) return;
    setPassportOpen(false);
    setPhase("fading");
    window.setTimeout(() => setPhase("ticket"), 950);
  }

  function startTear(event: PointerEvent<HTMLDivElement>) {
    if (phase !== "ticket") return;
    setIsTearing(true);
    setTearStartX(event.clientX);
    setTearProgress(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveTear(event: PointerEvent<HTMLDivElement>) {
    if (!isTearing || tearStartX === null || phase !== "ticket") return;
    const passWidth = event.currentTarget.getBoundingClientRect().width;
    const distance = Math.max(0, event.clientX - tearStartX);
    const nextProgress = Math.min(100, Math.round((distance / Math.max(passWidth * 0.72, 1)) * 100));
    setTearProgress(nextProgress);

    if (nextProgress >= 92) {
      setIsTearing(false);
      setTicketReady(false);
      setPassportOpen(false);
      setPhase("showcase");
      window.setTimeout(() => setTicketReady(true), 720);
    }
  }

  function endTear() {
    if (phase !== "ticket") return;
    setIsTearing(false);
    if (tearProgress < 92) setTearProgress(0);
  }



  function openPassport() {
    if (!ticketReady) return;
    setPassportOpen(true);
  }

  const boardingPassDetails = {
    passenger: form.username || "DWALTON29",
    passportNumber,
    platform: form.platform || "Xbox Series X|S",
    handle: form.handle || "DWALTON29",
    from: "BASE6 LOUNGE",
    to: "LEONIDA INTL",
    flight: "B66421",
    gate: "VI",
    seat: "22A",
    classType: "FIRST",
    arrival: arrivalStamp,
    departure: "19 NOV 26 00:00",
  };

  const passportIdentityDetails = {
    username: form.username || "Passenger",
    passportNumber,
    avatarUrl: form.profileImage || null,
    platform: form.platform || "Pending",
    handleLabel: platformLabel,
    handle: form.handle || "Pending",
    issued: passportIssueDate,
    record: recordLabel || "Clean record",
    business: businessReason || "Lounge traveller",
    bio: form.bio || "Nothing declared yet.",
  };

  function BoardingPassCard({ variant }: { variant: "paper" | "peek" | "flat" }) {
    return <Base6BoardingPass details={boardingPassDetails} variant={variant} />;
  }


  async function shareBoardingPass() {
    const shareText = `${form.username || "Passenger"} has checked in for Leonida on BASE6. Passport ${passportNumber}.`;
    if (typeof window === "undefined") return;

    const nav = window.navigator as Navigator & {
      share?: (data: { title: string; text: string }) => Promise<void>;
      clipboard?: Clipboard;
    };

    if (nav.share) {
      try {
        await nav.share({
          title: "BASE6 Boarding Pass",
          text: shareText,
        });
      } catch {
        // User cancelled native share; no action needed.
      }
      return;
    }

    if (nav.clipboard) {
      await nav.clipboard.writeText(shareText);
    }
  }

  return (
    <div className={`signup-screen signup-phase-${phase}`}>
      <div className="signup-ambient" aria-hidden="true" />

      {(phase === "details" || phase === "fading") && (
        <section className="boarding-shell signup-details-shell">
          <div className="boarding-topline">
            <Link className="boarding-back-link" href="/">← Back to gate</Link>
            <span className="boarding-code">BASE6 · BOARDING PASS</span>
          </div>

          <div className="boarding-progress" aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}>
            <span style={{ width: `${progress}%` }} />
          </div>


          <div key={transitionKey} className="boarding-step-card">
            <div className="boarding-question stack">
              <span className="eyebrow">{step.eyebrow}</span>
              <h1 className="h1 boarding-title">{dynamicTitle}</h1>
              <p className="copy boarding-copy">{dynamicCopy}</p>
            </div>

            <div className="boarding-answer">
              {step.type === "text" && (
                <input
                  className="boarding-input"
                  autoFocus
                  value={value}
                  onChange={(event) => updateField(step.key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") nextStep();
                  }}
                  placeholder={dynamicPlaceholder}
                />
              )}

              {step.type === "textarea" && (
                <textarea
                  className="boarding-textarea"
                  autoFocus
                  value={value}
                  onChange={(event) => updateField(step.key, event.target.value)}
                  placeholder={dynamicPlaceholder}
                />
              )}

              {step.type === "photo" && (
                <div className="boarding-photo-upload">
                  <div className="boarding-photo-preview">
                    {form.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.profileImage} alt="Selected passport ID" />
                    ) : (
                      <span>{form.username ? form.username.slice(0, 2).toUpperCase() : "ID"}</span>
                    )}
                  </div>
                  <label className="boarding-upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => updateProfileImage(event.target.files?.[0] ?? null)}
                    />
                    Choose passport photo
                  </label>
                  <p className="boarding-upload-note">This is local preview only for now — we’ll wire storage later.</p>
                </div>
              )}

              {step.type === "platform" && (
                <div className="boarding-choice-grid">
                  {["PlayStation 5", "Xbox Series X|S", "Steam / PC", "Not sure yet"].map((option) => (
                    <button
                      className={`boarding-choice ${value === option ? "selected" : ""}`}
                      key={option}
                      type="button"
                      onClick={() => updateField(step.key, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {step.type === "choice" && (
                <div className="boarding-declaration-stack">
                  <div className="boarding-choice-grid">
                    {step.options.map((option) => (
                      <button
                        className={`boarding-choice ${value === option ? "selected" : ""}`}
                        key={option}
                        type="button"
                        onClick={() => {
                          updateField(step.key, option);
                          if (option === "Spent time in San Andreas" && !form.sanAndreasYear) {
                            updateField("sanAndreasYear", "2013");
                          }
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  {declaredSanAndreas && (
                    <div className="boarding-sub-question">
                      <label htmlFor="san-andreas-year">When did you move there?</label>
                      <select
                        id="san-andreas-year"
                        className="boarding-input boarding-year-select"
                        value={form.sanAndreasYear || "2013"}
                        onChange={(event) => updateField("sanAndreasYear", event.target.value)}
                      >
                        {sanAndreasYears.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <p>Starting from 2013 — the year San Andreas opened for GTA V.</p>
                    </div>
                  )}
                </div>
              )}

              {step.type === "auth" && (
                <div className="boarding-auth-stack">
                  <input
                    className="boarding-input"
                    autoFocus
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="Email address"
                  />
                  <input
                    className="boarding-input"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") nextStep();
                    }}
                    placeholder="Password · at least 6 characters"
                  />
                  <p className="boarding-upload-note">For local testing, turn off email confirmation in Supabase Auth so profiles can save immediately.</p>
                </div>
              )}

              {step.type === "business" && (
                <div className="boarding-business-stack">
                  <div className="boarding-choice-grid">
                    {step.options.map((option) => (
                      <button
                        className={`boarding-choice ${form.business === option ? "selected" : ""}`}
                        key={option}
                        type="button"
                        onClick={() => {
                          updateField("business", option);
                          updateField("businessCustom", "");
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <input
                    className="boarding-input boarding-custom-business"
                    value={form.businessCustom}
                    onChange={(event) => {
                      updateField("businessCustom", event.target.value);
                      if (event.target.value.trim()) updateField("business", "");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") nextStep();
                    }}
                    placeholder="Something else? Tell customs your reason for travel..."
                  />
                </div>
              )}
            </div>


            {authError && <p className="boarding-error" role="alert">{authError}</p>}

            <div className="boarding-actions">
              <button className="button" type="button" onClick={previousStep} disabled={stepIndex === 0 || phase !== "details"}>
                Back
              </button>
              {!isLastStep ? (
                <button className="button primary" type="button" onClick={nextStep} disabled={!canContinue || phase !== "details"}>
                  Continue
                </button>
              ) : (
                <button className="button primary" type="button" onClick={printBoardingPass} disabled={!canContinue || phase !== "details" || isCreatingAccount}>
                  {isCreatingAccount ? "Issuing passport..." : "Print boarding pass"}
                </button>
              )}
            </div>
          </div>

        </section>
      )}

      {(phase === "ticket" || phase === "showcase" || phase === "leaving") && (
        <section className="ticket-print-stage base6-ticket-stage" aria-label="Printed boarding pass">
          {phase === "ticket" && (
            <>
              <div className="printer-slot" aria-hidden="true">
                <span />
              </div>
              <div
                className={`printed-document ${isTearing ? "is-tearing" : ""}`}
                onPointerDown={startTear}
                onPointerMove={moveTear}
                onPointerUp={endTear}
                onPointerCancel={endTear}
                style={{ "--tear-progress": `${tearProgress}%` } as CSSProperties}
              >
                <div className="printed-document__tear" aria-hidden="true">
                  <span className="printed-document__tear-pulse" />
                  <span className="printed-document__tear-copy">Swipe across tear line</span>
                </div>
                <div className="printed-document__pass">
                  <BoardingPassCard variant="paper" />
                </div>
              </div>
              <div className="base6-print-copy" aria-live="polite">
                <span>Boarding pass printed</span>
                <strong>Swipe to tear off your boarding pass</strong>
              </div>
            </>
          )}

          {phase === "showcase" && (
            <section className={`passport-reveal-scene ${ticketReady ? "ready" : ""} ${passportOpen ? "passport-is-open" : ""}`} aria-label="Leonida passport reveal">
              {!passportOpen ? (
                <>
                  <div className="passport-ticket-pocket" aria-hidden={!ticketReady}>
                    <div className="passport-document-stack">
                      <div className="passport-document-stack__ticket">
                        <BoardingPassCard variant="peek" />
                      </div>
                      <div className="passport-document-stack__cover">
                        <Base6PassportCover passportNumber={passportNumber} />
                      </div>
                    </div>
                  </div>
                  <button className="button primary open-passport-cta" type="button" onClick={openPassport} disabled={!ticketReady}>
                    Open Passport
                  </button>
                </>
              ) : (
                <>
                  <div className="open-passport-layout">
                    <div className="base6-open-passport-spread" aria-label="First pages of Leonida passport">
                      <Base6PassportIdentityPage details={passportIdentityDetails} />
                    </div>
                    <div className="passport-flat-ticket">
                      <BoardingPassCard variant="flat" />
                    </div>
                  </div>
                  <button className="button primary enter-lounge-cta" type="button" onClick={() => {
                    setPhase("leaving");
                    window.setTimeout(() => router.push("/lounge"), 420);
                  }}>
                    Enter Lounge
                  </button>
                </>
              )}
            </section>
          )}
        </section>
      )}


      {isScanningId && (
        <div className="id-scan-screen" role="status" aria-live="polite">
          <div className="id-scan-card">
            <div className="id-scan-photo-frame">
              <span className="id-scan-line" />
              {form.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.profileImage} alt="Scanning selected ID" />
              ) : (
                <span>{form.username ? form.username.slice(0, 2).toUpperCase() : "ID"}</span>
              )}
            </div>
            <span className="eyebrow">BASE6 passport control</span>
            <h2>Scanning ID</h2>
            <p>Checking passenger photo against your Leonida boarding pass.</p>
            <div className="id-scan-loader" aria-hidden="true"><span /></div>
          </div>
        </div>
      )}

      <div className="signup-blackout" aria-hidden="true" />
    </div>
  );
}
