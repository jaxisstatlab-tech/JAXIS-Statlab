// Entrance curtain for visitors arriving from the marketing site (?via=web). It is shown by the
// AUTH_CURTAIN_GATE script in the root layout's <head>, which runs before first paint, marks
// <html data-auth-curtain>, cleans the URL, and removes the mark once the curtain has lifted.
// (A <script> rendered here would be skipped on client-side navigation and trips a React warning.)
export const AUTH_CURTAIN_GATE = `(function(){try{var u=new URL(location.href);if(u.searchParams.get("via")!=="web")return;u.searchParams.delete("via");history.replaceState(history.state,"",u.pathname+(u.search||"")+u.hash);if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var h=document.documentElement;h.setAttribute("data-auth-curtain","");setTimeout(function(){h.removeAttribute("data-auth-curtain");},900);}catch(e){}})();`;

export function AuthCurtain() {
  return (
    <div aria-hidden="true" className="auth-curtain">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/jaxislogo.png" alt="" width={48} height={48} className="h-12 w-12" />
    </div>
  );
}
