import Image from "next/image";

// First-visit intro: on a clean dark screen the JAXIS logo rises into view, the wordmark settles in over a thin
// hairline, then the logo glides into the navbar logo while the cover lifts off the hero. Pure CSS so it always
// finishes, even if scripts are slow. A head script sets html[data-intro="skip"] on repeat visits in the same
// session or when reduced motion is requested.
export default function Intro() {
  return (
    <div aria-hidden="true" className="intro">
      <span className="intro-glow" />
      <Image src="/jaxislogo.png" alt="" width={92} height={92} priority sizes="92px" className="intro-mark" />
      <div className="intro-word font-sans text-[17px] font-semibold text-white">
        JAXIS <span className="font-normal text-white/60">StatLab</span>
      </div>
      <span className="intro-line" />
    </div>
  );
}
