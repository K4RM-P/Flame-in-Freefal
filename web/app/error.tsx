"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Route error boundary: a friendly message and a retry, never a blank page. The error is not hidden: its digest is shown.
import Link from "next/link";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 py-16">
      <p className="label">Something went wrong</p>
      <h1 className="display text-3xl leading-[1.1]">This view failed to load.</h1>
      <p className="text-mute">No result was produced, so nothing is shown in its place. Try again, or open another page.{error.digest ? <span className="num block pt-1 text-[12px] text-faint">ref {error.digest}</span> : null}</p>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-accent" onClick={reset}>Try again</button><Link className="btn" href="/">Home</Link></div>
    </section>
  );
}
