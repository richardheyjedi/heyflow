import { ImageResponse } from "next/og";

// Favicon/tab icon gerado em código (sem depender de arquivo binário): o
// mesmo glifo "grade" usado como marca em src/components/taskflow/sidebar.tsx,
// sobre o roxo de marca (#7c3aed) — referência à ideia de "gestão"
// (organização de painéis/módulos).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7c3aed",
          borderRadius: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
