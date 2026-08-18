"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: "40px 20px", textAlign: "center", background: "#f8faf7", color: "#173d29" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>Something went wrong</h1>
        <p style={{ color: "#4b5563", marginBottom: "24px" }}>
          {error?.message || "An unexpected system error occurred."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            background: "#16452c",
            color: "#ffffff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
