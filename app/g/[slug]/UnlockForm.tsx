"use client";

import { FormEvent, useState } from "react";

export default function UnlockForm({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/gifts/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not unlock this gift.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock this gift.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="gift-unlock-form">
      <label htmlFor="gift-password">A password, just between you two</label>
      <input
        id="gift-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
        maxLength={1024}
        placeholder="Enter the gift password"
      />
      <button type="submit" disabled={busy}>{busy ? "Opening your gift…" : "Unlock my gift"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
