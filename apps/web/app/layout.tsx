import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import CtaTracker from "./components/layout/CtaTracker";
import ConsentBanner from "./components/layout/ConsentBanner";
import ConsentedAnalytics from "./components/layout/ConsentedAnalytics";
import Intro from "./components/layout/Intro";
import ExitCurtain from "./components/layout/ExitCurtain";
import AnchorScroll from "./components/layout/AnchorScroll";
import { APP_URL } from "@/lib/config";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-custom",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mono-custom",
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
  openGraph: {
    title: "JAXIS StatLab — Statistical Consulting & Data Analysis Services",
    description: "Statistical consulting and data analysis service based in Maramag, Bukidnon, Philippines offering expert research and thesis support.",
    url: "https://jaxis-statlab.com",
    siteName: "JAXIS StatLab",
    locale: "en_PH",
    type: "website",
  },
};

// Play the intro once per session; skip it on repeat loads or when reduced motion is requested.
const INTRO_GATE = `(function(){var h=document.documentElement;try{if(sessionStorage.getItem("jx-intro")||matchMedia("(prefers-reduced-motion: reduce)").matches){h.dataset.intro="skip";}else{sessionStorage.setItem("jx-intro","1");window.addEventListener("load",function(){setTimeout(function(){h.dataset.intro="done";},2200);});}}catch(e){h.dataset.intro="skip";}})();`;

// If page scripts are slow or fail, reveal content anyway instead of leaving it invisible.
const REVEAL_FALLBACK = `window.addEventListener("load",function(){setTimeout(function(){var h=document.documentElement;if(!h.classList.contains("reveal-ready"))h.classList.add("reveal-fallback");},1500);});`;

// Only for a refresh: take over scroll position long enough to start at the top, then hand scroll
// memory back to the browser so Back and Forward return to where you were.
const SCROLL_TO_TOP_ON_RELOAD = `(function(){try{
var n=performance.getEntriesByType("navigation")[0];
if(!n||n.type!=="reload")return;
var hs=history,can="scrollRestoration" in hs;
if(can)hs.scrollRestoration="manual";
if(location.hash)hs.replaceState(null,"",location.pathname+location.search);
var top=function(){var h=document.documentElement,b=h.style.scrollBehavior;h.style.scrollBehavior="auto";window.scrollTo(0,0);h.style.scrollBehavior=b;};
top();
document.addEventListener("DOMContentLoaded",top,{once:true});
window.addEventListener("load",function(){top();requestAnimationFrame(function(){top();if(can)hs.scrollRestoration="auto";});},{once:true});
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://jaxis-statlab.com/#organization",
        name: "JAXIS StatLab",
        alternateName: ["JAXIS", "jaxisstatlab", "JAXIS StatLab Maramag"],
        url: "https://jaxis-statlab.com",
        logo: {
          "@type": "ImageObject",
          url: "https://jaxis-statlab.com/jaxislogo.png",
        },
        description:
          "Student-focused statistical consulting firm based in Maramag, Bukidnon, Philippines offering expert support in data analysis, thesis assistance, SPSS, RStudio, and academic research.",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Maramag",
          addressRegion: "Bukidnon",
          addressCountry: "PH",
        },
      },
      {
        "@type": "WebSite",
        "@id": "https://jaxis-statlab.com/#website",
        url: "https://jaxis-statlab.com",
        name: "JAXIS StatLab",
        publisher: {
          "@id": "https://jaxis-statlab.com/#organization",
        },
      },
    ],
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
      style={{ backgroundColor: "#010114" }}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href={new URL(APP_URL).origin} />
        <link rel="dns-prefetch" href={new URL(APP_URL).origin} />
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
        <script dangerouslySetInnerHTML={{ __html: SCROLL_TO_TOP_ON_RELOAD }} />
        <script dangerouslySetInnerHTML={{ __html: REVEAL_FALLBACK }} />
        <noscript>
          <style>{`.reveal,.status-badge{opacity:1!important;transform:none!important}.mark-draw{clip-path:none!important}.count{--num:var(--to)!important}`}</style>
        </noscript>
      </head>
      <body className="font-sans antialiased" style={{ backgroundColor: "#010114" }}>
        <Intro />
        <ExitCurtain />
        {children}
        <AnchorScroll />
        <CtaTracker />
        <ConsentedAnalytics />
        <ConsentBanner />
      </body>
    </html>
  );
}
