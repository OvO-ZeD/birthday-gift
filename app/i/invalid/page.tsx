import type { Metadata } from "next";
import "@/app/g/[slug]/gift.css";

export const metadata: Metadata = {
  title: "This link is no longer active | Afterglow",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
};

/**
 * Shown when an invitation link is unknown, expired or revoked.
 *
 * Deliberately says nothing about which of those it is. A revoked link and a never-existing one
 * look identical, so this page cannot be used to confirm that a particular token was once real.
 */
export default function InvalidInvitationPage() {
  return (
    <main className="public-gift" data-tone="dark">
      <div className="gift-light" aria-hidden="true" />
      <section className="gift-gate">
        <span className="gift-overline">AFTERGLOW</span>
        <div className="gift-heart" aria-hidden="true">♡</div>
        <h1>
          This link has <em>closed.</em>
        </h1>
        <p>
          This invitation is no longer active. It may have expired, or the sender may have
          replaced it. Ask them for a fresh link and it will work straight away.
        </p>
      </section>
    </main>
  );
}
