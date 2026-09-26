// Counts from 0 to `to` when its `.reveal` ancestor is shown. Pure CSS: an animatable
// integer custom property feeds a counter, so no JavaScript loop runs.
export default function CountUp({
  to,
  prefix = "",
  suffix = "",
  delay = 0,
  className = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="sr-only">
        {prefix}
        {to}
        {suffix}
      </span>
      <span aria-hidden="true" className="tabular-nums">
        {prefix}
        <span className="count" style={{ ["--to" as string]: to, ["--count-delay" as string]: `${delay}ms` }} />
        {suffix}
      </span>
    </span>
  );
}
