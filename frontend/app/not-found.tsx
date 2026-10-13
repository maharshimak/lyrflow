"use client";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          "var(--font-primary, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
      }}
    >
      <div style={{ opacity: 0.85 }}>
        Page not found.
      </div>
    </div>
  );
}

