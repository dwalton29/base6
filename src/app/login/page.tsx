"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase, hasSupabaseEnv } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setError("");

    if (!hasSupabaseEnv || !supabase) {
      setError("Add your Supabase URL and anon key to .env.local first.");
      return;
    }

    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/passport");
  }

  return (
    <div className="page auth-page">
      <section className="card stack auth-card">
        <span className="eyebrow">Passport control</span>
        <h1 className="h1">Return to base6.</h1>
        <p className="copy">Sign in with the email and password attached to your Leonida Passport.</p>
        <input
          className="boarding-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
        />
        <input
          className="boarding-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") signIn();
          }}
          placeholder="Password"
        />
        {error && <p className="boarding-error" role="alert">{error}</p>}
        <button className="button primary" type="button" onClick={signIn} disabled={isLoading || !email || !password}>
          {isLoading ? "Checking passport..." : "Enter lounge"}
        </button>
        <p className="copy small-copy">No passport yet? <Link href="/signup">Check in for Leonida</Link>.</p>
      </section>
    </div>
  );
}
