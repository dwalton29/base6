"use client";

import Link from "next/link";
import { Base6PassportCover, Base6PassportIdentityPage } from "@/components/base6/PassportDesign";
import { supabase, hasSupabaseEnv } from "@/lib/supabase";
import { getBase6BoardingAssignment } from "@/lib/boarding";
import { announcePassportStampAward, type PassportStampAwardDetail } from "@/lib/passportStampEvents";
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
    copy: "Pick the platform you’ll mostly be boarding from when Leonida opens the gates.",
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

type SignupPhase = "details" | "assigned" | "fading" | "ticket" | "showcase" | "leaving";

export default function SignupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SignupPhase>("details");
  const [isTearing, setIsTearing] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const [tearStartX, setTearStartX] = useState<number | null>(null);
  const [tearComplete, setTearComplete] = useState(false);
  const [ticketReady, setTicketReady] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [isScanningId, setIsScanningId] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [authError, setAuthError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [boardingAssignment, setBoardingAssignment] = useState(() => getBase6BoardingAssignment(1));
  const [earnedStampAwards, setEarnedStampAwards] = useState<PassportStampAwardDetail[]>([]);
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
        : step.type === "photo"
          ? true
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

      const { data: profileData, error: profileError } = await supabase.from("profiles").insert({
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
      })
        .select("boarding_sequence, boarding_group, boarding_flight, boarding_seat")
        .single();

      if (profileError) throw profileError;

      const sequence = Number(profileData?.boarding_sequence || 1);
      const fallbackAssignment = getBase6BoardingAssignment(sequence);
      setBoardingAssignment({
        boardingSequence: sequence,
        boardingGroup: profileData?.boarding_group || fallbackAssignment.boardingGroup,
        boardingFlight: profileData?.boarding_flight || fallbackAssignment.boardingFlight,
        boardingSeat: profileData?.boarding_seat || fallbackAssignment.boardingSeat,
      });

      const stampCodes = declaredSanAndreas ? ["checked_in", "san_andreas_veteran"] : ["checked_in"];
      const { data: stampRows, error: stampLookupError } = await supabase
        .from("passport_stamps")
        .select("id, code, name, description, icon")
        .in("code", stampCodes);

      if (stampLookupError) throw stampLookupError;

      if (stampRows?.length) {
        const { error: stampInsertError } = await supabase.from("user_passport_stamps").upsert(
          stampRows.map((stamp) => ({ user_id: user.id, stamp_id: stamp.id })),
          { onConflict: "user_id,stamp_id" }
        );
        if (stampInsertError) throw stampInsertError;

        const awardedStamps = stampRows
          .sort((a, b) => stampCodes.indexOf(a.code) - stampCodes.indexOf(b.code))
          .map((stamp) => ({
            title: stamp.name || "Passport Stamp",
            code: stamp.code,
            icon: stamp.icon,
            description: stamp.description || "Stamped into your Leonida Passport.",
            date: new Date().toISOString(),
          }));
        setEarnedStampAwards(awardedStamps);
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
    setPhase("assigned");
  }

  function continueToTicketRip() {
    if (phase !== "assigned") return;
    setTearProgress(0);
    setTearComplete(false);
    setPhase("fading");
    window.setTimeout(() => setPhase("ticket"), 950);
  }

  function startTear(event: PointerEvent<HTMLDivElement>) {
    if (phase !== "ticket" || tearComplete) return;
    setIsTearing(true);
    setTearStartX(event.clientX);
    setTearProgress(0);
    setTearComplete(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveTear(event: PointerEvent<HTMLDivElement>) {
    if (!isTearing || tearStartX === null || phase !== "ticket" || tearComplete) return;
    const passWidth = event.currentTarget.getBoundingClientRect().width;
    const distance = Math.max(0, event.clientX - tearStartX);
    const nextProgress = Math.min(100, Math.round((distance / Math.max(passWidth * 0.72, 1)) * 100));
    setTearProgress(nextProgress);

    if (nextProgress >= 92) {
      setIsTearing(false);
      setTearComplete(true);
      setTearProgress(100);
      setTicketReady(false);
      setPassportOpen(false);
      window.setTimeout(() => {
        setPhase("showcase");
        window.setTimeout(() => setTicketReady(true), 720);
        window.setTimeout(() => {
          earnedStampAwards.forEach((stamp, index) => {
            window.setTimeout(() => announcePassportStampAward(stamp), index * 3600);
          });
        }, 1500);
      }, 360);
    }
  }

  function endTear() {
    if (phase !== "ticket" || tearComplete) return;
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
    flight: boardingAssignment.boardingFlight,
    gate: "VI",
    seat: boardingAssignment.boardingSeat,
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
    flight: boardingAssignment.boardingFlight,
    seat: boardingAssignment.boardingSeat,
  };

  function BoardingPassCard() {
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
            <strong>{boardingPassDetails.passenger}</strong>
            <small>Passport no. {boardingPassDetails.passportNumber}</small>
          </div>

          <div className="one-pass-route">
            <div>
              <span>From</span>
              <strong>{boardingPassDetails.from}</strong>
            </div>
            <div>
              <span>To</span>
              <strong>{boardingPassDetails.to}</strong>
            </div>
            <div>
              <span>Terminal</span>
              <strong>{boardingPassDetails.platform}</strong>
            </div>
          </div>

          <div className="one-pass-fields">
            <span><small>Flight</small><strong>{boardingPassDetails.flight}</strong></span>
            <span><small>Gate</small><strong>{boardingPassDetails.gate}</strong></span>
            <span><small>Seat</small><strong>{boardingPassDetails.seat}</strong></span>
            <span><small>Arrival</small><strong>{boardingPassDetails.arrival}</strong></span>
            <span><small>Departure</small><strong>{boardingPassDetails.departure}</strong></span>
            <span><small>Class</small><strong>{boardingPassDetails.classType}</strong></span>
          </div>

          <div className="one-pass-stub">
            <strong>BASE6</strong>
            <span>Boarding pass</span>
            <small>{boardingPassDetails.passportNumber}</small>
          </div>
        </div>

        <div className="one-pass-footer">Please be at the gate when boarding begins</div>
      </article>
    );
  }

  function canvasRoundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    const nextRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + nextRadius, y);
    context.arcTo(x + width, y, x + width, y + height, nextRadius);
    context.arcTo(x + width, y + height, x, y + height, nextRadius);
    context.arcTo(x, y + height, x, y, nextRadius);
    context.arcTo(x, y, x + width, y, nextRadius);
    context.closePath();
  }

  function drawCanvasLabel(context: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, width: number, height: number) {
    canvasRoundRect(context, x, y, width, height, Math.min(8, height / 2));
    context.fillStyle = "rgba(255,255,255,.52)";
    context.fill();
    context.strokeStyle = "rgba(21, 17, 28, .07)";
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "rgba(21,17,28,.48)";
    context.font = "900 7px Arial, sans-serif";
    context.fillText(label.toUpperCase(), x + 7, y + 13);

    context.fillStyle = "#15111c";
    context.font = height < 34 ? "900 10px Arial, sans-serif" : "1000 12px Arial, sans-serif";
    drawCanvasText(context, value, x + 7, y + height - 11, width - 14);
  }

  function drawCanvasText(context: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number) {
    if (context.measureText(value).width <= maxWidth) {
      context.fillText(value, x, y);
      return;
    }

    let output = value;
    while (output.length > 1 && context.measureText(`${output}…`).width > maxWidth) {
      output = output.slice(0, -1);
    }
    context.fillText(`${output}…`, x, y);
  }

  async function createBoardingPassShareImage() {
    const scale = 2.5;
    const passWidth = 640;
    const passHeight = 320;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(passWidth * scale);
    canvas.height = Math.round(passHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create boarding pass image.");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);

    canvasRoundRect(context, 0, 0, passWidth, passHeight, 22);
    context.clip();
    context.fillStyle = "#fbf8ff";
    context.fillRect(0, 0, passWidth, passHeight);

    context.strokeStyle = "rgba(126, 68, 171, .08)";
    context.lineWidth = 1;
    for (let index = -passHeight; index < passWidth; index += 12) {
      context.beginPath();
      context.moveTo(index, passHeight);
      context.lineTo(index + passHeight, 0);
      context.stroke();
    }

    const headerGradient = context.createLinearGradient(0, 0, passWidth, 0);
    headerGradient.addColorStop(0, "#7427d9");
    headerGradient.addColorStop(.48, "#cc48f0");
    headerGradient.addColorStop(1, "#f35ccf");
    context.fillStyle = headerGradient;
    context.fillRect(0, 0, passWidth, 60);

    context.fillStyle = "#ffffff";
    context.font = "900 22px Arial, sans-serif";
    context.textAlign = "left";
    context.fillText("BASE6 AIRLINES", 18, 29);
    context.font = "1000 8px Arial, sans-serif";
    context.fillText("PASSENGER TICKET AND PASSPORT CHECK", 18, 43);
    context.font = "900 22px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText("BOARDING PASS", passWidth - 18, 29);
    context.font = "1000 8px Arial, sans-serif";
    context.fillText("LEONIDA FIRST CLASS", passWidth - 18, 43);
    context.textAlign = "left";

    const bodyX = 15;
    const bodyY = 73;
    const barcodeW = 104;
    const bodyContentH = 190;
    context.save();
    canvasRoundRect(context, bodyX, bodyY, barcodeW, bodyContentH, 8);
    context.clip();
    context.fillStyle = "#fbf8ff";
    context.fillRect(bodyX, bodyY, barcodeW, bodyContentH);
    let cursor = bodyX;
    const barSteps = [4, 3, 7, 4, 2, 6, 3, 5, 2, 8, 4, 3, 6, 2, 5, 4, 7, 3, 2, 6, 4, 5, 3, 8];
    for (const barWidth of barSteps) {
      context.fillStyle = "#050506";
      context.fillRect(cursor, bodyY, barWidth, bodyContentH);
      cursor += barWidth + 3;
    }
    context.restore();

    const mainX = 132;
    const mainW = 368;
    const stubX = 513;

    context.fillStyle = "rgba(21,17,28,.48)";
    context.font = "1000 8px Arial, sans-serif";
    context.fillText("PASSENGER", mainX, 82);
    context.fillStyle = "#15111c";
    context.font = "1000 20px Arial, sans-serif";
    drawCanvasText(context, boardingPassDetails.passenger, mainX, 105, mainW);
    context.fillStyle = "rgba(21,17,28,.68)";
    context.font = "1000 9px Arial, sans-serif";
    drawCanvasText(context, `Passport no. ${boardingPassDetails.passportNumber}`, mainX, 121, mainW);

    drawCanvasLabel(context, "From", boardingPassDetails.from, mainX, 129, 118, 47);
    drawCanvasLabel(context, "To", boardingPassDetails.to, mainX + 125, 129, 118, 47);
    drawCanvasLabel(context, "Terminal", boardingPassDetails.platform, mainX + 250, 129, 118, 47);

    const fieldY1 = 186;
    const fieldY2 = 231;
    const fieldW = 118;
    const fieldH = 35;
    drawCanvasLabel(context, "Flight", boardingPassDetails.flight, mainX, fieldY1, fieldW, fieldH);
    drawCanvasLabel(context, "Gate", boardingPassDetails.gate, mainX + 125, fieldY1, fieldW, fieldH);
    drawCanvasLabel(context, "Seat", boardingPassDetails.seat, mainX + 250, fieldY1, fieldW, fieldH);
    drawCanvasLabel(context, "Arrival", boardingPassDetails.arrival, mainX, fieldY2, fieldW, fieldH);
    drawCanvasLabel(context, "Depart", boardingPassDetails.departure, mainX + 125, fieldY2, fieldW, fieldH);
    drawCanvasLabel(context, "Class", boardingPassDetails.classType, mainX + 250, fieldY2, fieldW, fieldH);

    context.setLineDash([2, 4]);
    context.strokeStyle = "rgba(21, 17, 28, .20)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(stubX, 73);
    context.lineTo(stubX, 263);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#15111c";
    context.font = "1000 20px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("BASE6", stubX + 56, 162);
    context.fillStyle = "rgba(21,17,28,.48)";
    context.font = "1000 8px Arial, sans-serif";
    context.fillText("BOARDING PASS", stubX + 56, 178);
    context.fillStyle = "rgba(21,17,28,.68)";
    context.font = "1000 9px Arial, sans-serif";
    context.fillText(boardingPassDetails.passportNumber, stubX + 56, 193);
    context.textAlign = "left";

    const footerGradient = context.createLinearGradient(0, 282, passWidth, 282);
    footerGradient.addColorStop(0, "#7427d9");
    footerGradient.addColorStop(1, "#f35ccf");
    context.fillStyle = footerGradient;
    context.fillRect(0, 282, passWidth, 38);
    context.fillStyle = "#ffffff";
    context.font = "1000 10px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("PLEASE BE AT THE GATE WHEN BOARDING BEGINS", passWidth / 2, 305);
    context.textAlign = "left";

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not export boarding pass image."));
          return;
        }
        resolve(blob);
      }, "image/png", 0.96);
    });
  }

  async function shareBoardingPass() {
    if (typeof window === "undefined") return;

    setShareStatus("Preparing boarding pass…");
    const signupUrl = `${window.location.origin}/signup`;
    const shareText = `${form.username || "Passenger"} has checked in for Leonida on BASE6. Get your boarding pass:`;

    try {
      const blob = await createBoardingPassShareImage();
      const file = new File([blob], `base6-boarding-pass-${passportNumber}.png`, { type: "image/png" });
      const nav = window.navigator as Navigator & {
        canShare?: (data: ShareData & { files?: File[] }) => boolean;
        share?: (data: ShareData & { files?: File[] }) => Promise<void>;
        clipboard?: Clipboard;
      };

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          title: "BASE6 Boarding Pass",
          text: shareText,
          url: signupUrl,
          files: [file],
        });
        setShareStatus("Boarding pass ready to share.");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `base6-boarding-pass-${passportNumber}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);

      if (nav.clipboard) await nav.clipboard.writeText(signupUrl);
      setShareStatus("Image downloaded. Signup link copied.");
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : "Could not share boarding pass.");
    }
  }


  async function blobToDataUrl(blob: Blob) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read boarding pass image."));
      reader.onerror = () => reject(new Error("Could not read boarding pass image."));
      reader.readAsDataURL(blob);
    });
  }

  async function loadImageFromDataUrl(dataUrl: string) {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not prepare boarding pass for PDF."));
      image.src = dataUrl;
    });
  }

  async function convertPngBlobToJpegBytes(blob: Blob) {
    const dataUrl = await blobToDataUrl(blob);
    const image = await loadImageFromDataUrl(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare printable boarding pass.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Could not export printable boarding pass."));
          return;
        }
        resolve(nextBlob);
      }, "image/jpeg", 0.95);
    });

    return {
      bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    };
  }

  function createPdfFromJpegBytes(imageBytes: Uint8Array, imageWidth: number, imageHeight: number) {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let length = 0;

    function add(chunk: string | Uint8Array) {
      const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
      chunks.push(bytes);
      length += bytes.length;
    }

    function object(id: number, body: string | Uint8Array, prefix = "", suffix = "") {
      offsets[id] = length;
      add(`${id} 0 obj\n`);
      if (prefix) add(prefix);
      add(body);
      if (suffix) add(suffix);
      add("\nendobj\n");
    }

    const pageWidth = 842;
    const pageHeight = 595;
    const printableWidth = 760;
    const printableHeight = printableWidth * (imageHeight / imageWidth);
    const imageX = (pageWidth - printableWidth) / 2;
    const imageY = (pageHeight - printableHeight) / 2;
    const content = `q\n${printableWidth.toFixed(2)} 0 0 ${printableHeight.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm\n/Im0 Do\nQ`;

    add("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
    object(4, content, `<< /Length ${encoder.encode(content).length} >>\nstream\n`, "\nendstream");
    object(5, imageBytes, `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`, "\nendstream");

    const xrefOffset = length;
    add(`xref\n0 6\n0000000000 65535 f \n`);
    for (let id = 1; id <= 5; id += 1) {
      add(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
    }
    add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    const pdfBytes = new Uint8Array(length);
    let cursor = 0;
    for (const chunk of chunks) {
      pdfBytes.set(chunk, cursor);
      cursor += chunk.length;
    }

    return new Blob([pdfBytes], { type: "application/pdf" });
  }

  async function downloadBoardingPassPdf() {
    if (typeof window === "undefined") return;

    setShareStatus("Preparing printable boarding pass…");

    try {
      const imageBlob = await createBoardingPassShareImage();
      const { bytes, width, height } = await convertPngBlobToJpegBytes(imageBlob);
      const pdfBlob = createPdfFromJpegBytes(bytes, width, height);
      const objectUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `base6-boarding-pass-${passportNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
      setShareStatus("Printable PDF downloaded.");
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : "Could not create printable PDF.");
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
                  <div className="boarding-photo-actions">
                    <button className="boarding-skip-button" type="button" onClick={nextStep}>
                      Skip profile picture for now
                    </button>
                  </div>
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

      {phase === "assigned" && (
        <section className="boarding-shell seat-assignment-shell" aria-label="Assigned seat and flight">
          <div className="boarding-topline">
            <span className="boarding-back-link">BASE6 passport control</span>
            <span className="boarding-code">BOARDING CONFIRMED</span>
          </div>

          <div className="seat-assignment-card">
            <span className="eyebrow">You’ve been assigned</span>
            <h1 className="h1 boarding-title">Your place on the flight to Leonida is confirmed.</h1>
            <p className="copy boarding-copy">Keep this with your passport. Your boarding pass will print next.</p>

            <div className="seat-assignment-grid">
              <div className="seat-assignment-block">
                <span>Seat</span>
                <strong>{boardingAssignment.boardingSeat}</strong>
              </div>
              <div className="seat-assignment-block">
                <span>Flight</span>
                <strong>{boardingAssignment.boardingFlight}</strong>
              </div>
            </div>

            <div className="seat-assignment-meta">
              <span>Passenger</span>
              <strong>{form.username || "Passenger"}</strong>
              <small>Boarding group {boardingAssignment.boardingGroup} · Destination Leonida</small>
            </div>
          </div>

          <div className="seat-assignment-bottom">
            <button className="button primary" type="button" onClick={continueToTicketRip}>
              Next
            </button>
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
                className={`printed-document ${isTearing ? "is-tearing" : ""} ${tearComplete ? "is-torn" : ""}`}
                onPointerDown={startTear}
                onPointerMove={moveTear}
                onPointerUp={endTear}
                onPointerCancel={endTear}
                style={{
                  "--tear-progress": `${tearProgress}%`,
                  "--tear-rotation": `${Math.min(tearProgress * 0.035, 4.5)}deg`,
                  "--tear-drop": `${Math.min(tearProgress * 0.14, 18)}px`,
                } as CSSProperties}
              >
                <div className="printed-document__fixed-feed" aria-hidden="true">
                  <span className="printed-document__feed-label">BASE6 printer feed</span>
                </div>
                <div className="printed-document__tear" aria-hidden="true">
                  <span className="printed-document__tear-pulse" />
                  <span className="printed-document__tear-copy">Swipe across tear line</span>
                </div>
                <div className="printed-document__pass">
                  <span className="printed-document__ripped-edge" aria-hidden="true" />
                  <BoardingPassCard />
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
                        <BoardingPassCard />
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
                      <BoardingPassCard />
                    </div>
                  </div>
                  <div className="boarding-pass-share-panel">
                    <div className="boarding-pass-action-row">
                      <button className="button secondary share-boarding-pass-cta" type="button" onClick={shareBoardingPass}>
                        Share Boarding Pass
                      </button>
                      <button className="button secondary print-boarding-pass-cta" type="button" onClick={downloadBoardingPassPdf}>
                        Print Boarding Pass
                      </button>
                    </div>
                    <p>You can share or print this later from your documents page.</p>
                    {shareStatus && <span>{shareStatus}</span>}
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
