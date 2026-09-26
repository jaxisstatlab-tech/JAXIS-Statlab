import { SAMPLE_OUTPUT_URL } from "@/lib/config";
import { FILE_CODE, FILE_DATA, FILE_DEFENSE, FILE_WRITEUP, IsoScene, type IsoShape } from "../ui/Iso";
import Reveal from "../ui/Reveal";
import { btnGhost, cardDesc, container, heading, kicker } from "../ui/styles";

const ROWS = [
  {
    name: "(Constant)",
    b: "61.20",
    se: "2.84",
    beta: "",
    t: "21.55",
    p: "< .001",
  },
  {
    name: "Study habits",
    b: "0.42",
    se: "0.06",
    beta: ".41",
    t: "7.00",
    p: "< .001",
  },
  {
    name: "Study hours per week",
    b: "0.18",
    se: "0.07",
    beta: ".15",
    t: "2.57",
    p: ".011",
  },
  {
    name: "Sleep hours",
    b: "0.25",
    se: "0.11",
    beta: ".13",
    t: "2.27",
    p: ".024",
  },
  {
    name: "Strand (STEM = 1)",
    b: "0.61",
    se: "0.39",
    beta: ".09",
    t: "1.56",
    p: ".120",
  },
];

const FILES: {
  tag: string;
  type: string;
  title: string;
  shapes: IsoShape[];
}[] = [
  {
    tag: "Write-up",
    type: "DOCX",
    title: "Every result explained in plain English, ready for Chapter 4",
    shapes: FILE_WRITEUP,
  },
  {
    tag: "Data",
    type: "SAV · CSV",
    title: "Your cleaned dataset, labeled and ready to reopen",
    shapes: FILE_DATA,
  },
  {
    tag: "Code",
    type: "R · PY · SPS",
    title: "The exact script behind every number, so anyone can rerun it",
    shapes: FILE_CODE,
  },
  {
    tag: "Defense",
    type: "PDF",
    title: "The questions panels ask most, with answers in your own words",
    shapes: FILE_DEFENSE,
  },
];

export default function SampleOutput() {
  return (
    <section id="sample" className="relative scroll-mt-16 py-16 lg:py-24">
      <div className={container}>
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={kicker}>What you get</div>
            <h2 className={heading}>Files your adviser can open and check</h2>
          </div>
          {SAMPLE_OUTPUT_URL ? (
            <a
              href={SAMPLE_OUTPUT_URL}
              data-cta="sample-download"
              className={`${btnGhost} shrink-0`}
            >
              Download a full sample
            </a>
          ) : (
            <a href="#pricing" className={`${btnGhost} shrink-0`}>
              See pricing
            </a>
          )}
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[2px] border border-white/[0.08] bg-white/[0.08] lg:grid-cols-2">
          <div className="flex flex-col bg-[#07071C]">
            <Reveal className="flex flex-1 flex-col">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 pb-0 pt-10 sm:px-12">
                <div className="absolute inset-x-10 bottom-0 h-24 rounded-[50%] bg-[#CC6600]/15 blur-3xl" />
                <div className="glare glare-paper relative w-full max-w-xl translate-y-2 -rotate-1 overflow-hidden rounded-t-[2px] bg-[#F7F5F0] px-6 pb-8 pt-6 text-[#0B0B1A] shadow-[0_-10px_60px_-20px_rgba(204,102,0,0.35)]">
                  <p className="font-apa text-[13px] font-bold">Table 4</p>
                  <p className="font-apa text-[13px] italic">
                    Multiple Regression Results Predicting GWA
                  </p>
                  <table className="mt-3 w-full border-collapse font-apa text-[12.5px]">
                    <thead>
                      <tr className="border-y border-[#0B0B1A]">
                        <th className="py-1 text-left font-normal">
                          Predictor
                        </th>
                        {["B", "β", "t", "p"].map((h) => (
                          <th
                            key={h}
                            className="py-1 pl-3 text-right font-normal italic"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ROWS.map((r, i) => (
                        <tr
                          key={r.name}
                          className={
                            i === ROWS.length - 1
                              ? "border-b border-[#0B0B1A]"
                              : ""
                          }
                        >
                          <td className="py-0.5">{r.name}</td>
                          {[r.b, r.beta, r.t, r.p].map((v, j) => (
                            <td
                              key={j}
                              className="py-0.5 pl-3 text-right tabular-nums"
                            >
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 font-apa text-[11.5px]">
                    <span className="italic">Note.</span>{" "}
                    <span className="italic">N</span> = 220.{" "}
                    <span className="italic">R</span>² = .38,{" "}
                    <span className="italic">F</span>(4, 215) = 32.90,{" "}
                    <span className="italic">p</span> &lt; .001.
                  </p>
                </div>
              </div>
              <div className="relative border-t border-white/[0.08] p-6 sm:p-8">
                <div className="font-mono text-[11px] uppercase tracking-wider">
                  <span className="text-[#FFA040]">Tables</span>
                  <span className="text-white/50">
                    {" "}
                    · DOCX · APA 7th edition
                  </span>
                </div>
                <h3 className="mt-2 font-sans text-lg font-medium tracking-[-0.02em] text-white sm:text-xl">
                  Every table formatted to APA 7 and ready to paste
                </h3>
                <p className={`${cardDesc} mt-2 max-w-lg`}>
                  Example from a practice dataset. Your tables follow your
                  school&apos;s format, with notes and effect sizes included.
                </p>
              </div>
            </Reveal>
          </div>

          <ul className="grid grid-rows-4 gap-px bg-white/[0.08]">
            {FILES.map((f, i) => (
              <li key={f.tag} className="bg-[#07071C]">
                <Reveal
                  delay={60 + i * 60}
                  className="group flex h-full items-center gap-5 p-5 sm:p-6"
                >
                  <div className="glare relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[2px] bg-[#010114] sm:h-24 sm:w-32">
                    <IsoScene
                      id={`file-${f.tag}`}
                      shapes={f.shapes}
                      pad={16}
                      label={`${f.tag} file illustration`}
                      className="h-[78%] w-auto transition-transform duration-500 ease-out group-hover:-translate-y-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] uppercase tracking-wider">
                      <span className="text-[#FFA040]">{f.tag}</span>
                      <span className="text-white/50"> · {f.type}</span>
                    </div>
                    <p className="mt-1.5 font-sans text-[15px] font-medium leading-snug text-white">
                      {f.title}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
