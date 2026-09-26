// First-visit intro. Pure CSS so it always finishes, even if scripts are slow.
// A head script sets html[data-intro="skip"] on repeat visits in the same session
// or when reduced motion is requested, which hides it entirely.
export default function Intro() {
  return (
    <div aria-hidden="true" className="intro">
      <div className="intro-mark">
        <span className="intro-bar" style={{ height: "38%", background: "#D9D9D9" }} />
        <span className="intro-bar" style={{ height: "68%", background: "#CC6600" }} />
        <span className="intro-bar" style={{ height: "100%", background: "#E67300" }} />
      </div>
      <div className="intro-word font-sans text-lg font-semibold tracking-[-0.01em] text-white">
        JAXIS <span className="font-normal text-white/60">StatLab</span>
      </div>
      <div className="intro-meta font-mono text-[11px] text-white/45">jaxis.analyze(your_study)</div>
      <span className="intro-line" />
    </div>
  );
}
