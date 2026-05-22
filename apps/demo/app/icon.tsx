import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#18181b",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: 16,
          color: "#a1a1aa",
          fontWeight: 600,
          letterSpacing: -1
        }}
      >
        qa
      </div>
    ),
    size
  )
}

