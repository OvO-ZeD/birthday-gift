"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import "../login/login.css";
import "./auth-extras.css";

type Mode = "login" | "signup";
type Method = "password" | "link";

function friendlyError(error: unknown): string {
  const text = error instanceof Error ? error.message : "";
  if (/invalid login credentials/i.test(text)) {
    return "That email and password don't match. Check them, or choose “Email me a link” to sign in without a password.";
  }
  if (/email not confirmed/i.test(text)) {
    return "Please confirm your email first. Open the message we sent you and tap the link.";
  }
  if (/rate limit|too many/i.test(text)) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return text || "Something went wrong. Please try again.";
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(searchParams.get("error") ?? "");

  const usingLink = method === "link";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/studio`;

      if (usingLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setMessage(`Check ${email} for your sign-in link. You can close this tab once you've opened it.`);
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;

        if (data.session) {
          router.replace("/studio");
          router.refresh();
          return;
        }
        setMessage("Account created. Check your email and tap the confirmation link, then you're in.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/studio");
      router.refresh();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link href="/" className="auth-back">
        ← Back to home
      </Link>

      <section className="auth-card">
        <span className="auth-eyebrow">AFTERGLOW GIFT STUDIO</span>
        <h1>{mode === "login" ? "Welcome back." : "Create your studio."}</h1>
        <p className="auth-description">
          {mode === "login"
            ? "Sign in to keep creating something meaningful."
            : "One quick account to save, preview and publish your gifts."}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="How to sign in">
          <button
            type="button"
            role="tab"
            aria-selected={!usingLink}
            className={!usingLink ? "is-active" : ""}
            onClick={() => { setMethod("password"); setMessage(""); }}
          >
            Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={usingLink}
            className={usingLink ? "is-active" : ""}
            onClick={() => { setMethod("link"); setMessage(""); }}
          >
            Email me a link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {!usingLink && (
            <>
              <label htmlFor="password">Password</label>
              <div className="auth-password">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  data-sfx="off"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {mode === "signup" && <small className="auth-hint">At least 8 characters.</small>}
            </>
          )}

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <button type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : usingLink
                ? "Send my sign-in link"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
          </button>
        </form>

        {!usingLink && (
          <p className="auth-switch">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        )}
        {usingLink && <p className="auth-switch">New or returning, the link works for both.</p>}
      </section>
    </main>
  );
}

export default function AuthCard() {
  return (
    <Suspense fallback={<main className="auth-page">Loading…</main>}>
      <AuthForm />
    </Suspense>
  );
}
