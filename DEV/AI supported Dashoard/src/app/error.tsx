"use client";

import { RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-ink">
      <section className="glass-panel max-w-lg rounded-[28px] p-6 text-center">
        <p className="text-xs font-semibold uppercase text-coral">
          Runtime error
        </p>
        <h1 className="mt-2 text-2xl font-semibold">The dashboard paused.</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          {error.message ||
            "A recoverable client error occurred while rendering the dashboard."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition hover:bg-sea"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Try again
        </button>
      </section>
    </main>
  );
}
