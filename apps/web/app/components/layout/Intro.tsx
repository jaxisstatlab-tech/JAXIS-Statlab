// First-visit intro. Pure CSS so it always finishes, even if scripts are slow.
// A head script sets html[data-intro="skip"] on repeat visits in the same session
// or when reduced motion is requested, which hides it entirely.
export default function Intro() {
  return (
    <div aria-hidden="true" className="intro">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/jaxislogo.png" alt="" width={48} height={48} className="intro-logo" />
      <div className="intro-word font-sans text-lg font-semibold tracking-[-0.01em] text-white">
        JAXIS <span className="font-normal text-white/60">StatLab</span>
      </div>
      <div className="intro-meta font-mono text-[11px] text-white/45">jaxis.analyze(your_study)</div>
      <span className="intro-line" />
    </div>
  );
}
