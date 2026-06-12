"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_FLIGHT_STATUSES,
  FLIGHT_STATUS_MAX_LENGTH,
  buildCabinRows,
  demoFlightPassengers,
  flightDisplayName,
  flightInitials,
  normaliseFlightStatus,
  sortPassengersBySeat,
  type FlightPassenger,
  type FlightSeat,
} from "@/lib/flights";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

const PROFILE_SELECT_WITH_STATUS: string = "id, username, username_slug, display_name, passport_number, platform, platform_handle, avatar_url, reputation_score, boarding_flight, boarding_seat, flight_status, flight_status_updated_at, created_at";
const PROFILE_SELECT_BASE: string = "id, username, username_slug, display_name, passport_number, platform, platform_handle, avatar_url, reputation_score, boarding_flight, boarding_seat, created_at";

function passportHref(passenger: FlightPassenger) {
  const handle = passenger.username_slug || passenger.username || passenger.id;
  return `/passport?user=${encodeURIComponent(handle)}`;
}

function passengerHasStatusSupport(passenger: FlightPassenger) {
  return Object.prototype.hasOwnProperty.call(passenger, "flight_status");
}

function normalisePassenger(raw: any, includeStatus = true): FlightPassenger {
  const passenger: FlightPassenger = {
    id: String(raw.id),
    username: raw.username || null,
    username_slug: raw.username_slug || null,
    display_name: raw.display_name || null,
    passport_number: raw.passport_number || null,
    platform: raw.platform || null,
    platform_handle: raw.platform_handle || null,
    avatar_url: raw.avatar_url || null,
    reputation_score: raw.reputation_score ?? null,
    boarding_flight: raw.boarding_flight || null,
    boarding_seat: raw.boarding_seat || null,
    created_at: raw.created_at || null,
  };

  if (includeStatus) {
    passenger.flight_status = raw.flight_status || null;
    passenger.flight_status_updated_at = raw.flight_status_updated_at || null;
  }

  return passenger;
}

function Avatar({ passenger }: { passenger: FlightPassenger }) {
  const src = typeof passenger.avatar_url === "string" ? passenger.avatar_url.trim() : "";
  return (
    <span className="flight-avatar" aria-hidden="true">
      {src ? <img src={src} alt="" /> : flightInitials(passenger)}
    </span>
  );
}

function SeatButton({ seat, isCurrentUser, onSelect }: { seat: FlightSeat; isCurrentUser: boolean; onSelect: (passenger: FlightPassenger) => void }) {
  const passenger = seat.passenger;
  const className = [
    "flight-seat",
    passenger ? "is-occupied" : "",
    isCurrentUser ? "is-you" : "",
    passenger?.flight_status ? "has-status" : "",
  ].filter(Boolean).join(" ");

  if (!passenger) {
    return (
      <div className="flight-seat is-empty" aria-label={`Seat ${seat.code} is empty`}>
        <span>{seat.letter}</span>
      </div>
    );
  }

  return (
    <button className={className} type="button" onClick={() => onSelect(passenger)} aria-label={`Seat ${seat.code}, ${flightDisplayName(passenger)}`}>
      <Avatar passenger={passenger} />
      <span className="flight-seat-code">{seat.code}</span>
    </button>
  );
}

export default function FlightPage() {
  const [passengers, setPassengers] = useState<FlightPassenger[]>([]);
  const [currentPassenger, setCurrentPassenger] = useState<FlightPassenger | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<FlightPassenger | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [flightCode, setFlightCode] = useState("A-00");
  const [statusDraft, setStatusDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [message, setMessage] = useState("");
  const [statusColumnsAvailable, setStatusColumnsAvailable] = useState(true);

  useEffect(() => {
    async function loadFlight() {
      if (!hasSupabaseEnv || !supabase) {
        const demoPassengers = demoFlightPassengers();
        setPassengers(demoPassengers);
        setCurrentPassenger(demoPassengers[0]);
        setSelectedPassenger(null);
        setCurrentUserId(demoPassengers[0].id);
        setFlightCode("A-00");
        setStatusDraft(demoPassengers[0].flight_status || "");
        setMessage("Demo flight loaded. Run the flight SQL to enable live status updates.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setMessage("");
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          setCurrentUserId(null);
          setCurrentPassenger(null);
          setPassengers([]);
          setMessage("Check in or log in to see your assigned flight.");
          setIsLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        let profileRes = await supabase
          .from("profiles")
          .select(PROFILE_SELECT_WITH_STATUS)
          .eq("id", user.id)
          .maybeSingle();

        let hasStatusColumns = true;
        if (profileRes.error) {
          hasStatusColumns = false;
          profileRes = await supabase
            .from("profiles")
            .select(PROFILE_SELECT_BASE)
            .eq("id", user.id)
            .maybeSingle();
        }
        setStatusColumnsAvailable(hasStatusColumns);

        if (profileRes.error) throw profileRes.error;
        const profile = profileRes.data ? normalisePassenger(profileRes.data, hasStatusColumns) : null;
        if (!profile) {
          setMessage("No passport found for this account yet.");
          setIsLoading(false);
          return;
        }

        const nextFlightCode = profile.boarding_flight || "A-00";
        setFlightCode(nextFlightCode);
        setCurrentPassenger(profile);
        setSelectedPassenger(null);
        setStatusDraft(profile.flight_status || "");

        let passengerStatusColumnsAvailable = hasStatusColumns;
        let passengerRes = await supabase
          .from("profiles")
          .select(hasStatusColumns ? PROFILE_SELECT_WITH_STATUS : PROFILE_SELECT_BASE)
          .eq("boarding_flight", nextFlightCode)
          .order("boarding_sequence", { ascending: true })
          .limit(180);

        if (passengerRes.error && hasStatusColumns) {
          passengerStatusColumnsAvailable = false;
          setStatusColumnsAvailable(false);
          passengerRes = await supabase
            .from("profiles")
            .select(PROFILE_SELECT_BASE)
            .eq("boarding_flight", nextFlightCode)
            .order("boarding_sequence", { ascending: true })
            .limit(180);
        }

        if (passengerRes.error) throw passengerRes.error;
        const nextPassengers = ((passengerRes.data || []) as any[]).map((row) => normalisePassenger(row, passengerStatusColumnsAvailable));
        setPassengers(nextPassengers.length ? nextPassengers : [profile]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load your flight.");
      } finally {
        setIsLoading(false);
      }
    }

    loadFlight();
  }, []);

  useEffect(() => {
    async function loadFollowState() {
      if (!hasSupabaseEnv || !supabase || !currentUserId || !selectedPassenger || selectedPassenger.id === currentUserId) {
        setIsFollowing(false);
        return;
      }

      const { data } = await supabase
        .from("profile_follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
        .eq("following_id", selectedPassenger.id)
        .maybeSingle();
      setIsFollowing(Boolean(data));
    }

    void loadFollowState();
  }, [currentUserId, selectedPassenger]);

  const sortedPassengers = useMemo(() => sortPassengersBySeat(passengers), [passengers]);
  const cabinRows = useMemo(() => buildCabinRows(passengers), [passengers]);
  const occupiedCount = passengers.length;
  const currentSeat = currentPassenger?.boarding_seat || "TBC";
  const selectedIsMe = Boolean(selectedPassenger && currentUserId && selectedPassenger.id === currentUserId);

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv || !supabase || !currentPassenger || isSavingStatus) return;

    const nextStatus = normaliseFlightStatus(statusDraft);
    setIsSavingStatus(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ flight_status: nextStatus || null, flight_status_updated_at: new Date().toISOString() })
        .eq("id", currentPassenger.id);

      if (error) throw error;

      const applyStatus = (passenger: FlightPassenger): FlightPassenger => passenger.id === currentPassenger.id
        ? { ...passenger, flight_status: nextStatus || null, flight_status_updated_at: new Date().toISOString() }
        : passenger;

      setCurrentPassenger((current) => current ? applyStatus(current) : current);
      setSelectedPassenger((current) => current ? applyStatus(current) : current);
      setPassengers((current) => current.map(applyStatus));
      setStatusColumnsAvailable(true);
      setMessage("Flight status updated.");
    } catch (error) {
      setStatusColumnsAvailable(false);
      setMessage(error instanceof Error ? `${error.message}. Run supabase/base6_flight_system.sql to enable flight statuses.` : "Could not update flight status.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function followPassenger(passenger: FlightPassenger) {
    if (!hasSupabaseEnv || !supabase) {
      setMessage("Follow actions need Supabase connected.");
      return;
    }
    if (!currentUserId) {
      setMessage("Log in to follow passengers.");
      return;
    }
    if (passenger.id === currentUserId) return;

    const { error } = isFollowing
      ? await supabase.from("profile_follows").delete().eq("follower_id", currentUserId).eq("following_id", passenger.id)
      : await supabase.from("profile_follows").insert({ follower_id: currentUserId, following_id: passenger.id });

    if (error) {
      setMessage(error.message);
      return;
    }

    setIsFollowing(!isFollowing);
    setMessage(isFollowing ? `Unfollowed ${flightDisplayName(passenger)}.` : `Following ${flightDisplayName(passenger)}.`);
  }

  return (
    <div className="page flight-page stack">
      {message && <section className="flight-message">{message}</section>}

      <section className="flight-hero card">
        <div className="flight-hero-copy">
          <span className="eyebrow">Flight manifest</span>
          <h1 className="h2">Flight {flightCode} to Leonida</h1>
          <p className="copy">
            {currentPassenger
              ? `You are checked in at Seat ${currentSeat}. See who else is on your flight and set a short lounge status.`
              : "Your assigned cabin appears here once you have boarded."}
          </p>
        </div>
        <div className="flight-stats">
          <div><span>Seat</span><strong>{currentSeat}</strong></div>
          <div><span>Passengers</span><strong>{isLoading ? "—" : occupiedCount}</strong></div>
          <div><span>Gate</span><strong>29</strong></div>
        </div>
      </section>

      {!currentPassenger && !isLoading ? (
        <section className="card stack">
          <span className="eyebrow">No active boarding pass</span>
          <h2 className="h2">Check in first.</h2>
          <p className="copy">The flight map is built around your assigned boarding pass, flight and seat.</p>
          <div className="button-row">
            <Link className="button primary" href="/signup">Board Flight</Link>
            <Link className="button" href="/login">Log in</Link>
          </div>
        </section>
      ) : null}

      {currentPassenger ? (
        <section className="flight-layout">
          <main className="flight-cabin-card card">
            <div className="flight-cabin-header">
              <div>
                <span className="eyebrow">Cabin map</span>
                <h2 className="h3">Rows & seats</h2>
              </div>
              <span className="flight-cabin-label">A B C · D E F</span>
            </div>

            <div className="flight-plane-shell" aria-label={`Flight ${flightCode} cabin map`}>
              <div className="flight-plane-nose"><span>BASE6</span></div>
              <div className="flight-cabin-scroll">
                {cabinRows.map((row) => (
                  <div className="flight-row" key={row.row}>
                    <span className="flight-row-number">{row.row}</span>
                    <div className="flight-seat-group">
                      {row.seats.slice(0, 3).map((seat) => (
                        <SeatButton key={seat.code} seat={seat} isCurrentUser={seat.passenger?.id === currentUserId} onSelect={setSelectedPassenger} />
                      ))}
                    </div>
                    <span className="flight-aisle" aria-hidden="true" />
                    <div className="flight-seat-group">
                      {row.seats.slice(3).map((seat) => (
                        <SeatButton key={seat.code} seat={seat} isCurrentUser={seat.passenger?.id === currentUserId} onSelect={setSelectedPassenger} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          <aside className="flight-side stack">
            <section className="flight-status-card card stack">
              <div>
                <span className="eyebrow">Your status</span>
                <h2 className="h3">Lounge message</h2>
              </div>
              <form className="flight-status-form" onSubmit={saveStatus}>
                <textarea
                  className="textarea flight-status-input"
                  maxLength={FLIGHT_STATUS_MAX_LENGTH}
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                  placeholder="Waiting in the lounge."
                  disabled={!statusColumnsAvailable && hasSupabaseEnv}
                />
                <div className="flight-status-footer">
                  <small>{normaliseFlightStatus(statusDraft).length}/{FLIGHT_STATUS_MAX_LENGTH}</small>
                  <button className="button primary" type="submit" disabled={isSavingStatus || (!statusColumnsAvailable && hasSupabaseEnv)}>
                    {isSavingStatus ? "Saving..." : "Set status"}
                  </button>
                </div>
              </form>
              <div className="flight-status-presets" aria-label="Status presets">
                {DEFAULT_FLIGHT_STATUSES.slice(0, 4).map((status) => (
                  <button key={status} type="button" onClick={() => setStatusDraft(status)}>{status}</button>
                ))}
              </div>
            </section>

            <section className="flight-manifest-card card stack">
              <div>
                <span className="eyebrow">On this flight</span>
                <h2 className="h3">Passengers</h2>
              </div>
              <div className="flight-passenger-list">
                {sortedPassengers.slice(0, 12).map((passenger) => (
                  <button key={passenger.id} type="button" className={`flight-passenger-row${passenger.id === selectedPassenger?.id ? " is-active" : ""}`} onClick={() => setSelectedPassenger(passenger)}>
                    <Avatar passenger={passenger} />
                    <span><strong>{flightDisplayName(passenger)}</strong><small>{passenger.boarding_seat || "Seat TBC"}</small></span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </section>
      ) : null}

      {selectedPassenger ? (
        <section className="flight-passenger-sheet" aria-label="Passenger actions">
          <div className="flight-passenger-sheet-inner">
            <div className="flight-passenger-title">
              <Avatar passenger={selectedPassenger} />
              <div>
                <strong>{flightDisplayName(selectedPassenger)}</strong>
                <span>Seat {selectedPassenger.boarding_seat || "TBC"} · {selectedPassenger.passport_number || "Passport pending"}</span>
              </div>
              <button type="button" onClick={() => setSelectedPassenger(null)} aria-label="Close passenger actions">×</button>
            </div>
            <p className="flight-selected-status">
              {selectedPassenger.flight_status || (passengerHasStatusSupport(selectedPassenger) ? "No status set yet." : "Status updates unlock after the flight SQL is run.")}
            </p>
            <div className="flight-action-grid">
              <Link className="button primary" href={passportHref(selectedPassenger)}>View Passport</Link>
              <button className="button" type="button" onClick={() => setMessage("Direct messages can plug into this action when the message system lands.")}>Message</button>
              {!selectedIsMe ? (
                <button className="button" type="button" onClick={() => followPassenger(selectedPassenger)}>{isFollowing ? "Following" : "Follow"}</button>
              ) : (
                <Link className="button" href="/passport">My Passport</Link>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
