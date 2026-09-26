import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Mrs_Saint_Delafield } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { RouteProgressBar } from "./components/layout/RouteProgressBar";
import { MobileTouchLock } from "./components/layout/MobileTouchLock";
import { AUTH_CURTAIN_GATE } from "@/components/auth/AuthCurtain";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
});

const signatureFont = Mrs_Saint_Delafield({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-signature",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#010114",
};

export const metadata: Metadata = {
  title: "JAXIS StatLab Workspace",
  description: "Interactive statistical analysis tool, dataset workspace, and data modeling dashboard.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${signatureFont.variable}`}
      style={{ backgroundColor: "#010114" }}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: AUTH_CURTAIN_GATE }} />
      </head>
      <body className="font-sans antialiased" style={{ backgroundColor: "#010114" }}>
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <MobileTouchLock />
        {children}
      </body>
    </html>
  );
}
