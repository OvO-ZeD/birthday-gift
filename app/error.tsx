"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Afterglow page error:", error);
  }, [error]);

  return (
    <main className="afterglow-error-page" role="alert">
      <span className="afterglow-error-mark" aria-hidden="true">♡</span>
      <p className="afterglow-error-kicker">A SMALL PAUSE</p>
      <h1>That moment didn’t load.</h1>
      <p>Something went wrong while opening this page. Your saved gift should still be there, so try again.</p>
      <div className="afterglow-error-actions">
        <button type="button" onClick={() => reset()}>Try again</button>
        <Link href="/">Back to Afterglow</Link>
      </div>
    </main>
  );
}
