import type { Metadata } from "next";
import { CORE_TEAM } from "@/app/content/about";
import { PLANS } from "@/app/content/pricing";
import type { Faq } from "@/app/content/site";
import { CONTACT_EMAIL, FACEBOOK_URL } from "@/lib/config";

// One source for how the site describes itself to search engines, link previews, and AI assistants.
export const SITE_URL = "https://jaxis-statlab.com";
export const SITE_NAME = "JAXIS StatLab";
export const SITE_TAGLINE = "Thesis and research statistics, checked by two analysts";
export const SITE_DESCRIPTION =
  "Statistical consulting for students and researchers in the Philippines. We run the analysis for your thesis, survey, or dissertation, a second analyst rechecks every number, and you get APA tables and plain-English explanations you can defend. Fixed written price within 24 hours.";

const FACEBOOK = FACEBOOK_URL || "https://www.facebook.com/jaxisstatlab";

/**
 * Metadata for one page: title, description, canonical URL, and a link preview (Open Graph + X) that matches the
 * page instead of falling back to the home page's.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: path || "/" },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, locale: "en_PH", type: "website" },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description },
  };
}

/** FAQPage structured data for questions that are actually shown on the page. */
export function faqJsonLd(items: Faq[], path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}${path}#faq`,
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const founder = CORE_TEAM.find((m) => /founder/i.test(m.role) && /chief executive/i.test(m.role));

/** Organization, website, and the service packages with their real price ranges (from content/pricing.ts). */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: ["JAXIS", "jaxisstatlab", "JAXIS Stat Lab"],
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/jaxislogo.png` },
        image: `${SITE_URL}/opengraph-image`,
        description: SITE_DESCRIPTION,
        slogan: SITE_TAGLINE,
        email: CONTACT_EMAIL,
        priceRange: `₱${Math.min(...PLANS.map((p) => p.min))} and up`,
        currenciesAccepted: "PHP",
        paymentAccepted: "GCash, Bank transfer",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Maramag",
          addressRegion: "Bukidnon",
          postalCode: "8714",
          addressCountry: "PH",
        },
        areaServed: [
          { "@type": "Country", name: "Philippines" },
          { "@type": "AdministrativeArea", name: "Northern Mindanao" },
          { "@type": "AdministrativeArea", name: "Bukidnon" },
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: CONTACT_EMAIL,
          url: `${SITE_URL}/contact`,
          availableLanguage: ["English", "Filipino", "Cebuano"],
        },
        ...(founder ? { founder: { "@type": "Person", name: founder.name, jobTitle: founder.role } } : {}),
        knowsAbout: [
          "Statistical consulting",
          "Thesis statistics",
          "Survey data analysis",
          "Hypothesis testing",
          "t-test",
          "ANOVA",
          "Regression analysis",
          "Correlation analysis",
          "Structural equation modeling",
          "Path analysis",
          "Multilevel models",
          "Survival analysis",
          "Reliability analysis (Cronbach's alpha)",
          "APA 7th edition tables",
          "Thesis defense preparation",
          "SPSS",
          "R",
          "Jamovi",
          "SmartPLS",
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Statistical analysis packages",
          itemListElement: PLANS.map((p) => ({
            "@type": "Offer",
            url: `${SITE_URL}/pricing#plan-${p.id}`,
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "PHP",
              minPrice: p.min,
              ...(p.max !== null ? { maxPrice: p.max } : {}),
            },
            itemOffered: {
              "@type": "Service",
              name: p.name,
              description: `${p.bestFor}. ${p.features.join("; ")}. Ready in ${p.standard}.`,
              provider: { "@id": `${SITE_URL}/#organization` },
            },
          })),
        },
        sameAs: [FACEBOOK],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en-PH",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}
