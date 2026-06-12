import type { PassportIdentityDetails } from "@/components/base6/PassportDesign";
import type { OnboardingBoardingPassDetails } from "@/components/onboarding/OneBoardingPass";
import type { Base6BoardingAssignment } from "@/lib/boarding";

export type SignupForm = {
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

export const initialSignupForm: SignupForm = {
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

export const onboardingSteps = [
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

export type OnboardingStep = (typeof onboardingSteps)[number];

export function getPlatformLabel(platform: string) {
  if (platform.includes("PlayStation")) return "PSN";
  if (platform.includes("Xbox")) return "Gamertag";
  if (platform.includes("Steam") || platform.includes("PC")) return "Steam";
  return "Gamertag / PSN / Steam";
}

export function createPassportNumber(username: string, platform: string) {
  const source = `${username || "GUEST"}-${platform || "BASE6"}`;
  let total = 0;
  for (let index = 0; index < source.length; index += 1) {
    total += source.charCodeAt(index) * (index + 17);
  }
  return `B6-LND-${String(total % 1000000).padStart(6, "0")}`;
}

export function getBusinessReason(form: SignupForm) {
  return form.businessCustom.trim() || form.business;
}

export function getRecordLabel(form: SignupForm) {
  return form.crimeHistory === "Spent time in San Andreas"
    ? `Spent time in San Andreas · moved there in ${form.sanAndreasYear || "2013"}`
    : form.crimeHistory;
}

export function createBoardingPassDetails({
  form,
  passportNumber,
  arrivalStamp,
  boardingAssignment,
}: {
  form: SignupForm;
  passportNumber: string;
  arrivalStamp: string;
  boardingAssignment?: Base6BoardingAssignment;
}): OnboardingBoardingPassDetails {
  return {
    passenger: form.username || "DWALTON29",
    passportNumber,
    platform: form.platform || "Xbox Series X|S",
    handle: form.handle || "DWALTON29",
    from: "BASE6 LOUNGE",
    to: "LEONIDA INTL",
    flight: boardingAssignment?.boardingFlight || "A-00",
    gate: "VI",
    seat: boardingAssignment?.boardingSeat || "1A",
    classType: "FIRST",
    arrival: arrivalStamp,
    departure: "19 NOV 26 00:00",
  };
}

export function createPassportIdentityDetails({
  form,
  passportNumber,
  platformLabel,
  passportIssueDate,
  boardingAssignment,
}: {
  form: SignupForm;
  passportNumber: string;
  platformLabel: string;
  passportIssueDate: string;
  boardingAssignment?: Base6BoardingAssignment;
}): PassportIdentityDetails {
  return {
    username: form.username || "Passenger",
    passportNumber,
    avatarUrl: form.profileImage || null,
    platform: form.platform || "Pending",
    handleLabel: platformLabel,
    handle: form.handle || "Pending",
    issued: passportIssueDate,
    record: getRecordLabel(form) || "Clean record",
    business: getBusinessReason(form) || "Lounge traveller",
    bio: form.bio || "Nothing declared yet.",
    flight: boardingAssignment?.boardingFlight || "Pending",
    seat: boardingAssignment?.boardingSeat || "Pending",
  };
}
