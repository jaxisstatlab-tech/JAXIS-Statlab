import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileCTA from "./MobileCTA";
import ScrollFx from "./ScrollFx";
import GradualBlur from "../ui/GradualBlur";

// Chrome shared by every marketing page. Lives in each page (not a layout) so the
// scroll effects re-run against the new page's content after a client-side navigation.
export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <ScrollFx />
      <GradualBlur />
      <MobileCTA />
    </>
  );
}
