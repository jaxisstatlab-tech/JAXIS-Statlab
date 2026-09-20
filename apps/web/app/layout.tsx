import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";
import SmoothScroll from "./components/layout/SmoothScroll";

const disketMono = localFont({
  src: "./fonts/Disket-Mono-Regular.ttf",
  variable: "--font-disket",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jaxis-statlab.com"),
  title: "JAXIS StatLab — Statistical Consulting & Data Analysis Services",
  description: "Student-focused statistical consulting firm based in Maramag, Bukidnon, Philippines offering expert support in data analysis, thesis assistance, SPSS, RStudio, and academic research.",
  keywords: [
    "JAXIS StatLab",
    "jaxisstatlab",
    "JAXIS",
    "statistical consulting",
    "data analysis",
    "thesis assistance",
    "SPSS",
    "RStudio",
    "academic research",
    "Maramag Bukidnon",
    "statistical modeling",
    "Philippines",
  ],
  alternates: {
    canonical: "https://jaxis-statlab.com",
  },
  icons: {
    icon: "/jaxislogo.png",
    shortcut: "/jaxislogo.png",
    apple: "/jaxislogo.png",
  },
  openGraph: {
    title: "JAXIS StatLab — Statistical Consulting & Data Analysis Services",
    description: "Statistical consulting and data analysis service based in Maramag, Bukidnon, Philippines offering expert research and thesis support.",
    url: "https://jaxis-statlab.com",
    siteName: "JAXIS StatLab",
    locale: "en_PH",
    type: "website",
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
      className={`${disketMono.variable} ${inter.variable}`}
      style={{ backgroundColor: "#010114" }}
    >
      <body className="font-sans antialiased" style={{ backgroundColor: "#010114" }}>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
