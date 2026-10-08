"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DownloadSimple, FileText, WarningCircle } from "@phosphor-icons/react";
import { LoadingState } from "@repo/ui";

// Shows the real contents of a stored file inside the document viewer. Files are always fetched through the
// signed-in preview route, so the same access checks apply as for downloads. Types the browser can't show
// (SPSS, old Word/Excel, and so on) get a plain message and a Download button.

export type PreviewKind = "pdf" | "image" | "docx" | "sheet" | "csv" | "text" | "none";

export function previewKindOf(fileName: string): PreviewKind {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (ext === "docx") return "docx";
  if (ext === "xlsx") return "sheet";
  if (ext === "csv" || ext === "tsv") return "csv";
  if (ext === "txt") return "text";
  return "none";
}

// Big spreadsheets stay responsive: the table shows this many rows and says how many more there are.
const MAX_ROWS = 500;
const MAX_TEXT_CHARS = 200_000;

type Loaded = { status: "loading" } | { status: "ready"; blob: Blob } | { status: "error"; message: string };

function useFileBlob(url: string | null): Loaded {
  const [state, setState] = useState<Loaded>({ status: "loading" });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { credentials: "same-origin", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 401 || res.status === 403
              ? "You don't have access to this file."
              : res.status === 404
                ? "This file wasn't found in storage."
                : "The file couldn't be loaded. Try again, or download it."
          );
        }
        setState({ status: "ready", blob: await res.blob() });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: err instanceof Error ? err.message : "The file couldn't be loaded." });
      });
    return () => controller.abort();
  }, [url]);
  return state;
}

function Notice({
  title,
  body,
  tone = "info",
  onDownload,
}: {
  title: string;
  body: string;
  tone?: "info" | "error";
  onDownload: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-[2px] border border-white/[0.08] bg-[#0A0A18] px-8 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[2px] border border-white/10 bg-white/[0.04]">
        {tone === "error" ? (
          <WarningCircle size={24} weight="fill" className="text-white/70" />
        ) : (
          <FileText size={24} weight="fill" className="text-white/60" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-sans text-[15px] font-semibold text-white">{title}</h3>
        <p className="font-sans text-[13px] leading-relaxed text-white/55">{body}</p>
      </div>
      <button
        type="button"
        onClick={onDownload}
        className="inline-flex items-center gap-2 rounded-[2px] border border-white/15 px-4 py-2 font-sans text-[13px] font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.04]"
      >
        <DownloadSimple size={15} weight="bold" />
        Download
      </button>
    </div>
  );
}

const Loading = ({ label }: { label: string }) => (
  <div className="flex w-full justify-center py-24">
    <LoadingState variant="inline" label={label} />
  </div>
);

// Word documents can carry links; only ordinary web and email links stay clickable, and they open in a new tab.
function makeLinksSafe(root: HTMLElement) {
  root.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("#")) return;
    if (/^(https?:|mailto:)/i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } else {
      a.removeAttribute("href");
    }
  });
}

function DocxView({ blob, onDownload }: { blob: Blob; onDownload: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"rendering" | "done" | "failed">("rendering");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (cancelled || !bodyRef.current) return;
        await renderAsync(blob, bodyRef.current, styleRef.current ?? undefined, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
          // Never render embedded HTML chunks, tracked changes, or comments.
          renderAltChunks: false,
          renderChanges: false,
          renderComments: false,
        });
        if (cancelled || !bodyRef.current) return;
        makeLinksSafe(bodyRef.current);
        setState("done");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (state === "failed") {
    return (
      <Notice
        tone="error"
        title="This Word file couldn't be shown"
        body="It may be damaged or use features the preview doesn't support. Download it to open it in Word."
        onDownload={onDownload}
      />
    );
  }

  return (
    <div className="w-full">
      {state === "rendering" ? <Loading label="Opening document..." /> : null}
      <div ref={styleRef} />
      {/* The pages come from the file itself: white paper on the dark stage, scrolling sideways on narrow screens. */}
      <div
        ref={bodyRef}
        className="w-full overflow-x-auto select-text [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0 [&_.docx-wrapper>section.docx]:!mb-8 [&_.docx-wrapper>section.docx]:shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
      />
    </div>
  );
}

type Cell = string | number | boolean | Date | null | undefined;

function cellText(value: Cell): string {
  if (value === null || value === undefined) return "";
  // Spreadsheet dates are calendar dates stored as UTC; show them in UTC so the day never shifts.
  if (value instanceof Date) return value.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  return String(value);
}

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function DataTable({ rows }: { rows: Cell[][] }) {
  const shown = rows.slice(0, MAX_ROWS);
  const width = shown.reduce((max, r) => Math.max(max, r.length), 0);
  if (rows.length === 0 || width === 0) {
    return <p className="py-12 text-center font-sans text-sm text-white/50">This sheet is empty.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[70vh] overflow-auto rounded-[2px] border border-white/10">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 bg-[#141428]">
            <tr>
              <th className="border-b border-r border-white/10 px-2 py-2 text-right font-normal text-white/35">#</th>
              {Array.from({ length: width }, (_, c) => (
                <th key={c} className="border-b border-r border-white/10 px-3 py-2 font-normal text-white/45">
                  {columnName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={r} className="hover:bg-white/[0.03]">
                <td className="border-b border-r border-white/[0.06] px-2 py-1.5 text-right text-white/35">{r + 1}</td>
                {Array.from({ length: width }, (_, c) => (
                  <td key={c} className="max-w-[18rem] truncate border-b border-r border-white/[0.06] px-3 py-1.5 text-white/85" title={cellText(row[c])}>
                    {cellText(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-sans text-xs text-white/50">
        {rows.length > MAX_ROWS
          ? `Showing the first ${MAX_ROWS.toLocaleString()} of ${rows.length.toLocaleString()} rows. Download the file to see them all.`
          : `${rows.length.toLocaleString()} rows`}
      </p>
    </div>
  );
}

function SheetFrame({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-6xl rounded-[2px] border border-white/[0.08] bg-[#0A0A18] p-4 sm:p-5">{children}</div>;
}

function XlsxView({ blob, onDownload }: { blob: Blob; onDownload: () => void }) {
  const [sheets, setSheets] = useState<{ sheet: string; data: Cell[][] }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    import("read-excel-file/browser")
      .then(({ default: readXlsxFile }) => readXlsxFile(blob))
      .then((result) => {
        if (!cancelled) setSheets(result as { sheet: string; data: Cell[][] }[]);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (failed) {
    return (
      <Notice
        tone="error"
        title="This spreadsheet couldn't be shown"
        body="It may be damaged or password-protected. Download it to open it in Excel."
        onDownload={onDownload}
      />
    );
  }
  if (!sheets) return <Loading label="Opening spreadsheet..." />;

  const current = sheets[Math.min(active, sheets.length - 1)];
  return (
    <SheetFrame>
      {sheets.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {sheets.map((s, i) => (
            <button
              key={s.sheet}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-[2px] border px-3 py-1.5 font-sans text-xs transition-colors ${
                i === active ? "border-white/25 bg-white/[0.08] text-white" : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {s.sheet}
            </button>
          ))}
        </div>
      ) : null}
      <DataTable rows={current?.data ?? []} />
    </SheetFrame>
  );
}

// Comma- or tab-separated text, honouring quoted fields (which may contain commas, quotes, or line breaks).
function parseDelimited(text: string, delimiter: string): Cell[][] {
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function TextBasedView({ blob, fileName, asTable }: { blob: Blob; fileName: string; asTable: boolean }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    blob.text().then((t) => {
      if (!cancelled) setText(t);
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  const rows = useMemo(
    () => (text !== null && asTable ? parseDelimited(text, fileName.toLowerCase().endsWith(".tsv") ? "\t" : ",") : null),
    [text, asTable, fileName]
  );

  if (text === null) return <Loading label="Opening file..." />;
  if (rows) {
    return (
      <SheetFrame>
        <DataTable rows={rows} />
      </SheetFrame>
    );
  }
  return (
    <pre className="w-full max-w-4xl select-text overflow-auto whitespace-pre-wrap rounded-[2px] border border-white/15 bg-[#0A0A18] p-6 font-mono text-xs leading-relaxed text-white/85">
      {text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n\n… Download the file to see the rest.` : text}
    </pre>
  );
}

const NO_PREVIEW_HINT: Record<string, string> = {
  sav: "SPSS data files can't be shown in the browser. Download it to open it in SPSS or JASP.",
  doc: "Older Word files (.doc) can't be shown here. Download it to open it in Word.",
  xls: "Older Excel files (.xls) can't be shown here. Download it to open it in Excel.",
  pptx: "Slides can't be shown here. Download it to open it in PowerPoint.",
};

function FetchedPreview({ kind, url, fileName, onDownload }: { kind: PreviewKind; url: string; fileName: string; onDownload: () => void }) {
  const file = useFileBlob(url);
  if (file.status === "loading") return <Loading label="Loading file..." />;
  if (file.status === "error") {
    return <Notice tone="error" title="This file couldn't be opened" body={file.message} onDownload={onDownload} />;
  }
  if (kind === "docx") return <DocxView blob={file.blob} onDownload={onDownload} />;
  if (kind === "sheet") return <XlsxView blob={file.blob} onDownload={onDownload} />;
  return <TextBasedView blob={file.blob} fileName={fileName} asTable={kind === "csv"} />;
}

export function FileContentPreview({
  fileName,
  url,
  onDownload,
}: {
  fileName: string;
  /** The file's preview-route URL (or a local blob URL), or null when it isn't a stored file. */
  url: string | null;
  onDownload: () => void;
}) {
  const kind = previewKindOf(fileName);

  if (!url) {
    return (
      <Notice
        title="There's nothing to preview"
        body="This file has no stored copy to show here (for example a sample file in offline mode). Try downloading it."
        onDownload={onDownload}
      />
    );
  }

  if (kind === "none") {
    const ext = fileName.toLowerCase().split(".").pop() ?? "";
    return (
      <Notice
        title="Preview isn't available for this file"
        body={NO_PREVIEW_HINT[ext] ?? "This type of file can't be shown in the browser. Download it to open it on your computer."}
        onDownload={onDownload}
      />
    );
  }

  if (kind === "pdf") {
    return (
      <div className="h-[85vh] w-full max-w-5xl overflow-hidden rounded-[2px] border border-white/[0.08] bg-[#0A0A18]">
        <iframe src={url} className="h-full w-full border-none bg-white" title={fileName} />
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="flex items-center justify-center rounded-[2px] border border-white/[0.08] bg-[#0A0A18] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={fileName} className="max-h-[85vh] max-w-full rounded-[2px] object-contain" />
      </div>
    );
  }

  return <FetchedPreview kind={kind} url={url} fileName={fileName} onDownload={onDownload} />;
}
