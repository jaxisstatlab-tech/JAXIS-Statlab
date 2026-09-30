import Image from "next/image";
import PixelField from "../ui/PixelField";

// First-visit intro: the hero's pixel grid lights up in a sweep and gathers into the centre, where the JAXIS logo
// appears; the logo then flies into the navbar logo while the dark cover lifts off the hero, whose own grid stays
// as the background. Pure CSS so it always finishes, even if scripts are slow. A head script sets
// html[data-intro="skip"] on repeat visits in the same session or when reduced motion is requested.
export default function Intro() {
  return (
    <div aria-hidden="true" className="intro">
      <PixelField className="intro-grid" />
      <span className="intro-glow" />
      <Image src="/jaxislogo.png" alt="" width={92} height={92} priority sizes="92px" className="intro-mark" />
      <div className="intro-word font-sans text-[17px] font-semibold tracking-[-0.01em] text-white">
        JAXIS <span className="font-normal text-white/60">StatLab</span>
      </div>
    </div>
  );
}
