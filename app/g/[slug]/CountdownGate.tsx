"use client";

import { useEffect, useRef, useState } from "react";

type CountdownGateProps = {
  slug: string;
  /** ISO instant from the server. The countdown is driven by this, never by the device clock. */
  revealAt: string;
  /** The server's own clock at render time, so skew between it and the device is measurable. */
  serverNow: string;
  recipientName: string | null;
};

type Remaining = { days: number; hours: number; minutes: number; seconds: number; total: number };

function split(ms: number): Remaining {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * The countdown before a protected gift opens.
 *
 * Time is derived from the server's deadline corrected for the offset between the server clock
 * and this device — not from the device clock directly. A visitor whose machine is set to the
 * wrong date therefore still sees the correct remaining time, and because the deadline was
 * decided server-side, moving the clock cannot bring the reveal forward either way.
 *
 * When the timer reaches zero the page is refreshed once, so the next step appears without the
 * visitor doing anything. The refresh does not grant anything — it asks the server to re-decide,
 * which is the only thing that can advance the journey.
 */
export default function CountdownGate({
  slug,
  revealAt,
  serverNow,
  recipientName,
}: CountdownGateProps) {
  const offsetRef = useRef(0);
  const [remaining, setRemaining] = useState<Remaining>(() => split(0));
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    // Offset = server time - device time. Added back to every reading of the device clock.
    const skew = new Date(serverNow).getTime() - Date.now();
    offsetRef.current = skew;
    const deadline = new Date(revealAt).getTime();

    // Re-checks with the server on the boundary and reloads when it agrees the step has passed.
    // A short poll loop rather than a single shot, because the server is the authority on when
    // the deadline actually is and it may disagree with this device by a second or two.
    const advance = async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const response = await fetch(`/api/gifts/${encodeURIComponent(slug)}/status`, {
            cache: "no-store",
          });
          if (response.ok) {
            const payload = (await response.json()) as { state?: string; serverNow?: string };
            // Re-sync the offset from the server's own clock on every check.
            if (payload.serverNow) {
              offsetRef.current = new Date(payload.serverNow).getTime() - Date.now();
            }
            if (payload.state && payload.state !== "countdown") {
              window.location.reload();
              return;
            }
          }
        } catch {
          // Offline or interrupted: fall through to the retry below.
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
      // The server did not advance within the retries. Reload anyway so the visitor sees the
      // state the server reports rather than a frozen zero.
      window.location.reload();
    };

    let done = false;
    const update = () => {
      const now = Date.now() + offsetRef.current;
      const next = split(deadline - now);
      setRemaining(next);

      if (next.total <= 0 && !done) {
        done = true;
        setReloading(true);
        // Ask the server whether the conditions are now met, rather than assuming they are.
        // If the answer is not "open" the page reloads anyway and shows whatever the server
        // says comes next, so an early zero — from a wrong device clock, say — cannot skip a
        // step. The timer is a display; the server is the decision.
        void advance();
      }
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [revealAt, serverNow, slug]);

  const unit = (value: number, label: string) => (
    <div className="countdown-unit">
      <span className="countdown-value">{String(value).padStart(2, "0")}</span>
      <span className="countdown-label">{label}</span>
    </div>
  );

  return (
    <section className="gift-gate gift-gate-countdown">
      <span className="gift-overline">
        {recipientName ? `SOMETHING FOR ${recipientName.toUpperCase()}` : "SOMETHING FOR YOU"}
      </span>
      <div className="gift-heart" aria-hidden="true">♡</div>
      <h1>
        Almost <em>time.</em>
      </h1>
      <p>This little world opens on its own. You don&rsquo;t need to do anything.</p>

      {/* Announced politely rather than constantly, so a screen reader is not interrupted
          once a second by a timer it cannot act on. */}
      <div
        className="countdown-grid"
        role="timer"
        aria-live="off"
        aria-label={`Opens in ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes`}
      >
        {remaining.days > 0 && unit(remaining.days, "days")}
        {unit(remaining.hours, "hours")}
        {unit(remaining.minutes, "minutes")}
        {unit(remaining.seconds, "seconds")}
      </div>

      <small>
        {reloading
          ? "Opening…"
          : `Opens ${new Date(revealAt).toLocaleString(undefined, {
              dateStyle: "long",
              timeStyle: "short",
            })}`}
      </small>
      <noscript>
        {/* Without JavaScript the timer cannot tick, so the deadline is stated plainly and the
            visitor can reload when it passes. */}
        <p>This gift opens on {new Date(revealAt).toUTCString()}.</p>
      </noscript>
      <span hidden data-countdown-slug={slug} />
    </section>
  );
}
