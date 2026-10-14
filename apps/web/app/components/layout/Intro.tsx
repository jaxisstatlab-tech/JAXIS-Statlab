import Image from "next/image";

// First-visit intro (about 1.5s): on a clean dark screen the JAXIS bars grow up into view, the wordmark slides out
// from behind them, and a hairline under the lockup fills like a progress bar. Then the whole lockup glides into the
// top-left corner and lands exactly on the navbar logo (it's drawn at 2x the navbar's size and scaled to half) while
// the cover fades off the hero. Pure CSS so it always finishes, even if scripts are slow. A head script sets
// html[data-intro="skip"] on repeat visits in the same session or when reduced motion is requested.
export default function Intro() {
  return (
    <div aria-hidden="true" className="intro">
      <div className="intro-brand font-sans text-[30px] font-semibold tracking-[-0.01em] text-white">
        <Image src="/logo-132.webp" alt="" width={44} height={44} priority unoptimized className="intro-mark" />
        <span className="intro-word">
          JAXIS <span className="font-normal text-white/60">StatLab</span>
        </span>
      </div>
      <span className="intro-bar">
        <span />
      </span>
    </div>
  );
}
