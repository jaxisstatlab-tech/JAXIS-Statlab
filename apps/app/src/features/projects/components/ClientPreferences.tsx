import { preferredAddOnsLabel, preferredPackageLabel } from "@/features/projects/intake-preferences";

// What the client would like, from the intake form: preferred package, add-ons and their notes. Admins see all
// three (a starting point for the quote); analysts and reviewers see only the notes (`notesOnly`).
// Studies sent before the form asked show "Not asked".

export function ClientPreferences({
  preferredPackage,
  preferredAddOns,
  clientNotes,
  notesOnly = false,
  className = "",
}: {
  preferredPackage?: string | null;
  preferredAddOns?: string[] | null;
  clientNotes?: string | null;
  notesOnly?: boolean;
  className?: string;
}) {
  const notes = clientNotes?.trim();
  if (notesOnly && !notes) return null;
  const pkg = preferredPackageLabel(preferredPackage);
  const addOns = preferredAddOnsLabel(preferredAddOns);
  const notAsked = <span className="text-white/40">Not asked (sent before the form had this)</span>;

  return (
    <dl className={`grid grid-cols-1 gap-4 font-sans text-[13px] sm:grid-cols-2 ${className}`}>
      {!notesOnly ? (
        <>
          <div>
            <dt className="text-[12px] font-medium text-white/45">Preferred package</dt>
            <dd className="mt-0.5 text-white/85">{pkg ?? notAsked}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-white/45">Add-ons they want</dt>
            <dd className="mt-0.5 text-white/85">{addOns ?? notAsked}</dd>
          </div>
        </>
      ) : null}
      <div className="sm:col-span-2">
        <dt className="text-[12px] font-medium text-white/45">Additional notes from the client</dt>
        <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-white/80">{notes || <span className="text-white/40">None</span>}</dd>
      </div>
    </dl>
  );
}
