"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h2>
          {/* Dev only: show the error so it can be read off a phone without devtools */}
          {process.env.NODE_ENV === "development" && (
            <pre style={{ maxWidth: "90vw", whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.7 }}>
              {error.message}
              {"\n"}
              {typeof window !== "undefined" ? window.location.pathname : ""}
            </pre>
          )}
          <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
