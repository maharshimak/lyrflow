"use client";

import * as React from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
      }}
    >
      <div style={{ opacity: 0.9, textAlign: "center" }}>Something went wrong.</div>
      <div style={{ opacity: 0.6, fontSize: 12, maxWidth: 720, textAlign: "center" }}>
        {String(error?.message ?? error)}
      </div>
      <button
        onClick={() => reset()}
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.16)",
          color: "white",
          padding: "10px 16px",
          borderRadius: 12,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}

