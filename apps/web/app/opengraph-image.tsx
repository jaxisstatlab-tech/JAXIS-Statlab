import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "JAXIS StatLab: Thesis statistics you can defend";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [0.18, 0.3, 0.48, 0.7, 0.9, 1, 0.9, 0.7, 0.48, 0.3, 0.18];

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/jaxislogo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#010114",
          backgroundImage: "radial-gradient(ellipse 70% 60% at 80% 110%, rgba(204,102,0,0.35), transparent 70%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={40} height={40} />
          <span>JAXIS</span>
          <span style={{ fontWeight: 400, opacity: 0.6 }}>StatLab</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
            <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -3, fontWeight: 600 }}>Thesis statistics</div>
            <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -3, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
              you can defend.
            </div>
            <div style={{ marginTop: 28, fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
              Checked by two statisticians. Explained in plain English.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 260 }}>
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 22,
                  height: 260 * h,
                  background: i === 5 ? "#E67300" : `rgba(204,102,0,${0.15 + h * 0.3})`,
                  borderTop: "2px solid rgba(255,190,120,0.8)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
