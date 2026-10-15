import Link from "next/link";

export default function NotFound() {
  return (
    <main className="afterglow-error-page">
      <span className="afterglow-error-mark" aria-hidden="true">♡</span>
      <p className="afterglow-error-kicker">WRONG LITTLE CORNER</p>
      <h1>This page isn’t here.</h1>
      <p>The link may be incomplete, or this gift may no longer be available.</p>
      <div className="afterglow-error-actions"><Link href="/">Return home</Link><Link href="/login">Log in</Link></div>
    </main>
  );
}
