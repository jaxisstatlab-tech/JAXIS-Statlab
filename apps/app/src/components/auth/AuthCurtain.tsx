// Entrance curtain for visitors arriving from the marketing site (?via=web). The inline script
// runs before first paint: it shows the curtain only for that handoff, then cleans the URL.
const GATE = `(function(){try{var u=new URL(location.href);if(u.searchParams.get("via")!=="web")return;u.searchParams.delete("via");history.replaceState(history.state,"",u.pathname+(u.search||"")+u.hash);if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var c=document.getElementById("auth-curtain");if(c)c.setAttribute("data-play","");}catch(e){}})();`;

export function AuthCurtain() {
  return (
    <>
      <div id="auth-curtain" aria-hidden="true" className="auth-curtain" suppressHydrationWarning>
        <div className="auth-curtain-mark">
          <span style={{ height: "38%", background: "#D9D9D9" }} />
          <span style={{ height: "68%", background: "#CC6600" }} />
          <span style={{ height: "100%", background: "#E67300" }} />
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: GATE }} />
    </>
  );
}
