// Shared look for the sign-in screens, matching the marketing site's type and controls.
//
// Note: app/globals.css has unlayered resets (`h1..p { margin: 0 }`, `a { color: inherit; text-decoration: none }`)
// that beat Tailwind utilities. So spacing here comes from flex gaps on a wrapper, and link colours use `!`.
export const authHeading = "flex flex-col gap-2";
export const authTitle = "font-sans text-[1.75rem] font-medium leading-tight tracking-[-0.03em] text-white";
export const authSubtitle = "font-sans text-sm leading-relaxed text-white/60";

// Passed to FormInput's className: 44px tall fields (comfortable touch targets).
export const authField =
  "!h-12 text-sm rounded-[2px] !bg-[#010D1F] transition-[border-color,box-shadow] duration-150 focus:!shadow-[0_0_0_3px_rgba(204,102,0,0.16)]";

// Passed to Button's className for the main action.
export const authSubmit =
  "group w-full !h-12 min-h-[48px] gap-2 text-sm font-semibold rounded-[2px] tracking-normal shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]";

// A link that looks like the primary button (never nest a <button> inside a link).
export const authLinkButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[2px] bg-[#CC6600] px-5 font-sans text-sm font-semibold !text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#E67300] active:scale-[0.97]";

export const authTextLink =
  "!text-white/75 !underline decoration-white/25 underline-offset-4 transition-colors hover:!text-white";
export const authAccentLink = "font-medium !text-[#FFA040] transition-colors hover:!text-[#FFB366]";
export const authBackLink =
  "group inline-flex w-fit items-center gap-1.5 font-sans text-xs !text-white/55 transition-colors hover:!text-white";
