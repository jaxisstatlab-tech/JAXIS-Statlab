import { ChatCircleText, FolderSimple, ListChecks, ShieldCheck } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { REGISTER_URL } from "@/lib/config";
import Reveal from "../ui/Reveal";
import TrackerFeed from "../ui/TrackerFeed";
import { btnInk, container } from "../ui/styles";

const FEATURES: { icon: Icon; title: string; body: string }[] = [
  { icon: ListChecks, title: "5-stage tracker", body: "Always know where your study is." },
  { icon: ShieldCheck, title: "Two-statistician checks", body: "Every result rerun before release." },
  { icon: ChatCircleText, title: "Chat inside your study", body: "No more random group chats." },
  { icon: FolderSimple, title: "Every file in one place", body: "Download anytime you need it." },
];

export default function PipelineBand() {
  return (
    <section className="relative overflow-hidden bg-[#CC6600] py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(1,1,20,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(1,1,20,0.4)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_80%_50%,black,transparent_70%)]"
      />
      <div className={`${container} relative grid grid-cols-1 items-center gap-12 lg:grid-cols-12`}>
        <Reveal className="lg:col-span-5">
          <h2 className="max-w-md font-sans text-2xl font-medium leading-tight tracking-[-0.03em] text-[#010114] sm:text-3xl lg:text-[2rem]">
            From raw data to defense-ready in one place
          </h2>
          <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-[#010114]/80 sm:text-[15px]">
            Every update on your study shows up in your tracker the moment it happens.
          </p>

          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: FeatureIcon, title, body }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-[#010114]/10">
                  <FeatureIcon size={16} weight="fill" className="text-[#010114]" />
                </span>
                <div>
                  <div className="font-sans text-sm font-semibold text-[#010114]">{title}</div>
                  <div className="mt-0.5 font-sans text-[13px] text-[#010114]/75">{body}</div>
                </div>
              </li>
            ))}
          </ul>

          <a href={REGISTER_URL} data-cta="band-signup" className={`${btnInk} mt-9`}>
            Create a free account
          </a>
        </Reveal>

        <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
          <TrackerFeed />
        </Reveal>
      </div>
    </section>
  );
}
