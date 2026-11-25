"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center" }}>
          <h1>Ripzy is temporarily unavailable</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset} style={{ padding: "10px 20px", borderRadius: 10, border: 0, background: "#bf4268", color: "#fff" }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
