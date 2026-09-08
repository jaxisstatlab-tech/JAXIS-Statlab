"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  FilePdf,
  FileDoc,
  FileCsv,
  FileXls,
  FileText,
  Check,
  Printer,
} from "@phosphor-icons/react";
import {
  getFileMeta,
  formatFileCategory,
  triggerFileDownload,
} from "@/lib/file-utils";
import type { ProjectFileItem } from "@/features/projects/schemas";

interface DocSection {
  heading: string;
  paragraphs?: string[];
  listItems?: { label: string; text: string }[];
  callout?: { label: string; text: string }[];
  table?: {
    headers: string[];
    rows: { col1: string; col2: string; col3: string }[];
  };
}

interface DocContentModel {
  title: string;
  subtitle: string;
  context: string;
  pages: {
    pageNumber: number;
    sections: DocSection[];
  }[];
}

function getDocContent(fileName: string, category: string): DocContentModel {
  const nameLower = fileName.toLowerCase();
  const cleanTitle = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  // 1. Standard Operating Procedure (SOP) / Operations / Security
  if (
    nameLower.includes("sop") ||
    nameLower.includes("standard operating procedure") ||
    nameLower.includes("procedure") ||
    nameLower.includes("protocol") ||
    nameLower.includes("guideline") ||
    nameLower.includes("production-grade")
  ) {
    return {
      title: cleanTitle,
      subtitle: "Standard Operating Procedure: Production Systems & Quality Assurance Governance",
      context: "Prepared for Institutional Quality Gate & Operational Security Protocol (Effective 2026).",
      pages: [
        {
          pageNumber: 1,
          sections: [
            {
              heading: "1. Purpose & Administrative Scope",
              paragraphs: [
                "This Standard Operating Procedure (SOP) establishes mandatory verification benchmarks for research data processing, statistical computing scripts, and deliverable handoffs across the StatLab analytics pipeline.",
                "Compliance with these operational safeguards ensures zero data tampering, reproducible syntax execution, and full alignment with APA 7th publication standards.",
              ],
            },
            {
              heading: "2. Procedural Roles & Responsibilities",
              listItems: [
                {
                  label: "Lead Researcher",
                  text: "Responsible for initial data sanitization, codebook labeling, and submission of verified instrument matrices.",
                },
                {
                  label: "Statistical Analyst",
                  text: "Executes parameterized syntax in isolated virtual environments, generating primary descriptive and inferential test outputs.",
                },
                {
                  label: "Quality Gate Reviewer",
                  text: "Conducts independent dual-statistician audits to verify mathematical accuracy and signs the official certification record.",
                },
              ],
            },
            {
              heading: "3. Quality Gate Milestone Verification Matrix",
              table: {
                headers: ["Phase / Checkpoint", "Operational Requirement", "Verification Standard"],
                rows: [
                  {
                    col1: "Phase 1: Intake Sanitization",
                    col2: "PII Scrubbing & Outlier Boundary Verification",
                    col3: "SHA-256 Checksum",
                  },
                  {
                    col1: "Phase 2: Dual Computation",
                    col2: "Parallel SPSS Syntax and Python SciPy Verification",
                    col3: "Zero Variance Parity",
                  },
                  {
                    col1: "Phase 3: APA 7th Review",
                    col2: "Table Formatting, Decimal Rules & p-value Precision",
                    col3: "Peer-Review Signoff",
                  },
                ],
              },
            },
          ],
        },
        {
          pageNumber: 2,
          sections: [
            {
              heading: "4. Anomaly Resolution & Parametric Violation Protocol",
              paragraphs: [
                "When parametric assumptions (normality via Shapiro-Wilk or homogeneity of variance via Levene's test) are violated at the α = 0.05 threshold, analysts must execute the approved non-parametric contingency protocol.",
              ],
              callout: [
                {
                  label: "Mandatory Escalation",
                  text: "All assumption violations must be documented with corresponding non-parametric tests (e.g., Mann-Whitney U, Kruskal-Wallis, or bootstrapping at 5,000 resamples).",
                },
                {
                  label: "Data Integrity Defense",
                  text: "Raw datasets must remain immutable. No records may be removed without explicit written clearance from the Lead Researcher.",
                },
              ],
            },
            {
              heading: "5. Version Control & Audit Trail Standards",
              paragraphs: [
                "All analysis syntax, dataset transformations, and markdown logs are versioned in git repositories with signed cryptographic commit hashes. Client data snapshots are encrypted at rest using AES-256 encryption.",
              ],
            },
          ],
        },
        {
          pageNumber: 3,
          sections: [
            {
              heading: "6. Authorization, Audit Sign-Off & Institutional Endorsement",
              paragraphs: [
                "This operational dossier has been reviewed and ratified by the Quality Assurance Committee and the Lead Statistical Consultant.",
              ],
              listItems: [
                {
                  label: "Document Classification",
                  text: "Standard Operating Procedure (Internal & Client Technical Reference)",
                },
                {
                  label: "Revision Cycle",
                  text: "Bi-annual audit review with mandatory regression testing",
                },
                {
                  label: "Authorization Status",
                  text: "ACTIVE & FULLY ENFORCED",
                },
              ],
            },
          ],
        },
      ],
    };
  }

  // 2. Lead Researcher Profile / CV / Credentials
  if (
    nameLower.includes("profile") ||
    nameLower.includes("cv") ||
    nameLower.includes("resume") ||
    nameLower.includes("bio") ||
    nameLower.includes("investigator") ||
    nameLower.includes("researcher")
  ) {
    return {
      title: cleanTitle,
      subtitle: "Lead Researcher Profile Dossier & Institutional Credentials",
      context: "Institutional Review Board (IRB) Verified · Academic Registry 2026",
      pages: [
        {
          pageNumber: 1,
          sections: [
            {
              heading: "1. Principal Investigator & Academic Information",
              paragraphs: [
                "Official credentials and research specialization dossier for the registered Lead Researcher. This profile establishes verified credentials for data custodianship and statistical analysis clearance.",
              ],
              listItems: [
                {
                  label: "Academic Designation",
                  text: "Lead Researcher / Graduate Research Scholar",
                },
                {
                  label: "Field of Study",
                  text: "Quantitative Sciences, Social Analytics & Applied Statistics",
                },
                {
                  label: "Ethical Clearances",
                  text: "Institutional Ethics Review Board (IRB) Protocol Clearance Verified",
                },
              ],
            },
            {
              heading: "2. Methodological & Analytical Competencies",
              table: {
                headers: ["Domain / Skill", "Statistical Treatment", "Tooling Framework"],
                rows: [
                  {
                    col1: "Inferential Analysis",
                    col2: "Two-Way ANOVA, ANCOVA & Multiple Regression",
                    col3: "IBM SPSS Statistics v29",
                  },
                  {
                    col1: "Instrument Validation",
                    col2: "Exploratory & Confirmatory Factor Analysis (EFA/CFA)",
                    col3: "RStudio / Lavaan",
                  },
                  {
                    col1: "Non-Parametric Methods",
                    col2: "Mann-Whitney U, Kruskal-Wallis & Chi-Square",
                    col3: "Python SciPy / Pandas",
                  },
                ],
              },
            },
          ],
        },
        {
          pageNumber: 2,
          sections: [
            {
              heading: "3. Research Cohorts & Institutional Affiliations",
              paragraphs: [
                "Authorized access protocols to university participant cohorts, academic databases, and high-performance computing laboratory environments for quantitative empirical research.",
              ],
              callout: [
                {
                  label: "IRB Ethics Code",
                  text: "Protocol #2026-STAT-0982-IRB · Active compliance with Data Privacy Act and Human Subjects Protection mandates.",
                },
                {
                  label: "Data Custody",
                  text: "Lead Researcher holds primary custodianship of survey instruments and anonymized sample data files.",
                },
              ],
            },
            {
              heading: "4. Research Track Record & Past Studies",
              paragraphs: [
                "Demonstrated history of peer-reviewed quantitative studies across educational leadership, applied econometrics, and behavioral health research.",
              ],
            },
          ],
        },
        {
          pageNumber: 3,
          sections: [
            {
              heading: "5. Institutional Sign-Off & Verification Status",
              paragraphs: [
                "This profile dossier is officially archived in the JAXIS StatLab Academic Registry and is attached to all related research projects.",
              ],
              listItems: [
                {
                  label: "Registry Status",
                  text: "Active & Fully Verified",
                },
                {
                  label: "Verification ID",
                  text: "JAXIS-RES-2026-SECURE",
                },
              ],
            },
          ],
        },
      ],
    };
  }

  // 3. Survey Questionnaire / Tool / Instrument
  if (
    nameLower.includes("questionnaire") ||
    nameLower.includes("survey") ||
    nameLower.includes("instrument") ||
    nameLower.includes("scale") ||
    nameLower.includes("tool") ||
    category === "QUESTIONNAIRE"
  ) {
    return {
      title: cleanTitle,
      subtitle: "Standardized Survey Questionnaire & Instrumentation Blueprint",
      context: "Instrument Reliability Index: Cronbach's Alpha α = 0.88 · 4-Point Likert Scale",
      pages: [
        {
          pageNumber: 1,
          sections: [
            {
              heading: "1. Instrument Architecture & Measurement Scale",
              paragraphs: [
                "Structured measurement instrument formulated for quantitative data collection. Designed with a 4-point Likert rating scale to eliminate neutral-point response bias.",
              ],
              listItems: [
                {
                  label: "Scale Rating 4",
                  text: "Strongly Agree (Observed continuously / exemplary standard)",
                },
                {
                  label: "Scale Rating 3",
                  text: "Agree (Frequently observed / standard compliance)",
                },
                {
                  label: "Scale Rating 2",
                  text: "Disagree (Seldom observed / partial compliance)",
                },
                {
                  label: "Scale Rating 1",
                  text: "Strongly Disagree (Never observed / critical deficiency)",
                },
              ],
            },
            {
              heading: "2. Survey Question Inventory Table",
              table: {
                headers: ["Item #", "Survey Statement / Indicator", "Target Variable"],
                rows: [
                  {
                    col1: "Item 01",
                    col2: "Statistical automation tools improve the accuracy of analytical workflows.",
                    col3: "Operational Efficiency",
                  },
                  {
                    col1: "Item 02",
                    col2: "Institutional data validation reduces overall turnaround time for research studies.",
                    col3: "Research Velocity",
                  },
                  {
                    col1: "Item 03",
                    col2: "Standardized APA 7th reporting format satisfies dissertation panel requirements.",
                    col3: "Compliance Quality",
                  },
                ],
              },
            },
          ],
        },
        {
          pageNumber: 2,
          sections: [
            {
              heading: "3. Reliability & Expert Validation Results",
              paragraphs: [
                "Content validity was evaluated by three independent expert panel members (S-CVI/Ave = 0.94). Internal consistency verified through pilot testing (N = 30).",
              ],
              callout: [
                {
                  label: "Cronbach's Alpha (α)",
                  text: "α = 0.884 across 20 composite survey items, demonstrating excellent internal consistency.",
                },
                {
                  label: "Informed Consent",
                  text: "All participants provide electronic written consent with full anonymity guarantees.",
                },
              ],
            },
            {
              heading: "4. Participant Inclusion Criteria",
              paragraphs: [
                "Participants are selected via stratified random sampling from active institutional departments. Sample size adequacy determined using Yamane formula (e = 0.05).",
              ],
            },
          ],
        },
        {
          pageNumber: 3,
          sections: [
            {
              heading: "5. Scoring Dictionary & Variable Rubric",
              paragraphs: [
                "Composite scores are computed by taking the weighted mean of items per indicator cluster and mapped to descriptive verbal interpretations in accordance with APA 7th standards.",
              ],
              listItems: [
                {
                  label: "Mean 3.50 – 4.00",
                  text: "Very High / Strongly Agree",
                },
                {
                  label: "Mean 2.50 – 3.49",
                  text: "High / Agree",
                },
                {
                  label: "Mean 1.50 – 2.49",
                  text: "Low / Disagree",
                },
                {
                  label: "Mean 1.00 – 1.49",
                  text: "Very Low / Strongly Disagree",
                },
              ],
            },
          ],
        },
      ],
    };
  }

  // 4. Default: Research Proposal / Thesis Manuscript (Chapters 1–3)
  return {
    title: cleanTitle,
    subtitle: "Statistical Analysis Proposal & Analytical Framework Blueprint",
    context: "Prepared for Institutional Registry & Statistical Review (Academic Year 2026).",
    pages: [
      {
        pageNumber: 1,
        sections: [
          {
            heading: "1. Project Overview & Problem Statement",
            paragraphs: [
              "This research study investigates quantitative and categorical variables to evaluate underlying patterns and correlations across observed sample populations. The primary objective is to execute rigorous descriptive and inferential statistical treatments aligned with APA 7th standards.",
              "All datasets submitted under this registry are verified against standard measurement scales (Likert 4-point/5-point, categorical nominal indices, and ratio-level performance metrics) to eliminate outliers and ensure high statistical power.",
            ],
          },
          {
            heading: "2. Scope & Target Population",
            listItems: [
              {
                label: "Primary Sample",
                text: "University and institutional research cohorts enrolled across multiple academic departments.",
              },
              {
                label: "Sampling Technique",
                text: "Stratified random sampling with verified sample adequacy using Cochran and Yamane formula thresholds.",
              },
              {
                label: "Instrumentation",
                text: "Standardized multi-item survey questionnaires with validated Cronbach's alpha internal consistency coefficient (α ≥ 0.82).",
              },
            ],
          },
          {
            heading: "3. Analytical Objectives & Scope Summary",
            table: {
              headers: ["Objective", "Description & Variables", "Statistical Treatment"],
              rows: [
                {
                  col1: "Obj. 01",
                  col2: "Demographic & Institutional Profile",
                  col3: "Frequency & Percentage",
                },
                {
                  col1: "Obj. 02",
                  col2: "Level of Observed Engagement",
                  col3: "Weighted Mean & Std. Dev.",
                },
                {
                  col1: "Obj. 03",
                  col2: "Significant Difference / Correlation",
                  col3: "ANOVA & Pearson's r",
                },
              ],
            },
          },
        ],
      },
      {
        pageNumber: 2,
        sections: [
          {
            heading: "4. Research Questions & Statistical Hypotheses",
            paragraphs: [
              "The analysis addresses null hypotheses evaluated at the α = 0.05 level of significance:",
            ],
            callout: [
              {
                label: "H_01",
                text: "There is no significant difference in respondent performance when grouped according to demographic profile.",
              },
              {
                label: "H_02",
                text: "There is no significant relationship between observed research indicators and performance indices.",
              },
            ],
          },
          {
            heading: "5. Statistical Software & Computational Engine",
            paragraphs: [
              "All calculations are performed using IBM SPSS Statistics (v29.0) and custom Python scientific computing pipelines (NumPy, SciPy, Pandas). Results undergo dual-statistician verification to guarantee zero mathematical discrepancy prior to release.",
            ],
          },
        ],
      },
      {
        pageNumber: 3,
        sections: [
          {
            heading: "6. Final Deliverable Package (APA 7th Edition)",
            paragraphs: [
              "Upon completion of the analytical phase and QA Gate clearance, the client receives the comprehensive package containing:",
            ],
            listItems: [
              {
                label: "Chapter 4 Formatted Tables",
                text: "Publication-ready APA 7th statistical tables with exact p-values.",
              },
              {
                label: "Narrative Interpretation",
                text: "Standard academic interpretations ready for direct thesis/dissertation integration.",
              },
              {
                label: "Clean SPSS Dataset (.sav)",
                text: "Fully coded and labeled matrix with recorded syntax logs.",
              },
              {
                label: "Certificate of Statistical Analysis",
                text: "Signed institutional certificate for defense and panel submission.",
              },
            ],
          },
        ],
      },
    ],
  };
}

export interface DocumentViewerLightboxProps {
  file: ProjectFileItem | null;
  files?: ProjectFileItem[];
  onNavigateFile?: (file: ProjectFileItem) => void;
  onClose: () => void;
}

export function DocumentViewerLightbox({
  file,
  files,
  onNavigateFile,
  onClose,
}: DocumentViewerLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const totalPages = 3;

  const currentFileIndex = useMemo(() => {
    if (!file || !files || files.length === 0) return -1;
    return files.findIndex((f) => f.id === file.id);
  }, [file, files]);

  const hasMultipleFiles = Boolean(files && files.length > 1 && currentFileIndex !== -1);

  const handlePrevDocument = useCallback(() => {
    if (!hasMultipleFiles || !files || !onNavigateFile) return;
    const prevIndex = currentFileIndex > 0 ? currentFileIndex - 1 : files.length - 1;
    onNavigateFile(files[prevIndex]!);
  }, [hasMultipleFiles, files, onNavigateFile, currentFileIndex]);

  const handleNextDocument = useCallback(() => {
    if (!hasMultipleFiles || !files || !onNavigateFile) return;
    const nextIndex = currentFileIndex < files.length - 1 ? currentFileIndex + 1 : 0;
    onNavigateFile(files[nextIndex]!);
  }, [hasMultipleFiles, files, onNavigateFile, currentFileIndex]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset page and zoom when file changes
  useEffect(() => {
    setCurrentPage(1);
    setZoomLevel(100);
  }, [file]);

  // Scroll back to top when flipping pages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  // Keyboard navigation & body scroll locking
  const isPdfOrDoc = Boolean(
    file &&
      (file.fileName.toLowerCase().endsWith(".pdf") ||
        file.fileName.toLowerCase().endsWith(".docx") ||
        file.fileName.toLowerCase().endsWith(".doc") ||
        file.fileCategory === "RESEARCH_DOCUMENT")
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "[" || (e.altKey && e.key === "ArrowLeft")) {
        if (hasMultipleFiles) {
          e.preventDefault();
          handlePrevDocument();
        }
      } else if (e.key === "]" || (e.altKey && e.key === "ArrowRight")) {
        if (hasMultipleFiles) {
          e.preventDefault();
          handleNextDocument();
        }
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (isPdfOrDoc && currentPage < totalPages) {
          setCurrentPage((prev) => prev + 1);
        } else if (hasMultipleFiles) {
          handleNextDocument();
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (isPdfOrDoc && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else if (hasMultipleFiles) {
          handlePrevDocument();
        }
      }
    },
    [onClose, totalPages, isPdfOrDoc, currentPage, hasMultipleFiles, handlePrevDocument, handleNextDocument]
  );

  useEffect(() => {
    if (file) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [file, handleKeyDown]);

  if (!mounted || !file) return null;

  const meta = getFileMeta(file.fileName, file.fileType);
  const category = formatFileCategory(file.fileCategory);
  const isPdf = file.fileName.toLowerCase().endsWith(".pdf");

  const R2_PUBLIC_DEV_URL = "https://pub-70de33883ce54230863841fbf74f07b3.r2.dev";
  const realFileUrl =
    file.filePath.startsWith("http://") || file.filePath.startsWith("https://")
      ? file.filePath
      : file.filePath.startsWith("studies/") || file.filePath.startsWith("uploads/") || file.filePath.startsWith("intake-uploads/")
      ? `${R2_PUBLIC_DEV_URL}/${file.filePath}`
      : null;

  const isRealPdf = isPdf && Boolean(realFileUrl);

  const isCsv =
    file.fileName.toLowerCase().endsWith(".csv") ||
    file.fileName.toLowerCase().endsWith(".tsv");

  const isImage =
    file.fileName.toLowerCase().endsWith(".png") ||
    file.fileName.toLowerCase().endsWith(".jpg") ||
    file.fileName.toLowerCase().endsWith(".jpeg") ||
    file.fileName.toLowerCase().endsWith(".webp");

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await triggerFileDownload(file.filePath, file.fileName);
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch {
      setIsDownloading(false);
    }
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 15, 160));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 15, 70));
  const handleResetZoom = () => setZoomLevel(100);

  const content = (
    <div className="fixed inset-0 z-50 bg-[#000814]/96 backdrop-blur-md flex flex-col select-none text-white animate-in fade-in duration-200">
      {/* ── Top Precision Document Toolbar ── */}
      <header
        className="h-16 flex-shrink-0 bg-[#010D1F] border-b border-white/10 flex items-center justify-between gap-4 z-40 px-6 sm:px-8"
        style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem" }}
      >
        {/* Left: Document Icon + Title */}
        <div className="flex items-center gap-3.5 min-w-0 max-w-[45%]">
          <div className="h-9 w-9 rounded-[2px] bg-[#011B38] border border-white/15 flex items-center justify-center flex-shrink-0">
            {meta.iconType === "pdf" ? (
              <FilePdf size={20} weight="fill" className="text-rose-400" />
            ) : meta.iconType === "doc" ? (
              <FileDoc size={20} weight="fill" className="text-sky-400" />
            ) : meta.iconType === "data" ? (
              <FileCsv size={20} weight="fill" className="text-emerald-400" />
            ) : meta.iconType === "sheet" ? (
              <FileXls size={20} weight="fill" className="text-emerald-400" />
            ) : (
              <FileText size={20} weight="fill" className="text-white/70" />
            )}
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span className="font-sans font-semibold text-sm text-white truncate" title={file.fileName}>
              {file.fileName}
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-white/50">
              <span className="text-sky-300 font-semibold">{category.label}</span>
              {hasMultipleFiles && (
                <>
                  <span>·</span>
                  <span className="text-[#FFA040] font-semibold">
                    Doc {currentFileIndex + 1} of {files!.length}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Document Stepper Buttons */}
          {hasMultipleFiles && (
            <div className="hidden sm:flex items-center gap-1 bg-[#01142B] border border-white/15 p-0.5 rounded-[2px] ml-1 shrink-0">
              <button
                type="button"
                onClick={handlePrevDocument}
                className="p-1 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.97]"
                title="Previous Document (← or [)"
                aria-label="Previous Document"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
              <span className="text-[10px] font-mono text-white/40 px-1">
                {currentFileIndex + 1}/{files!.length}
              </span>
              <button
                type="button"
                onClick={handleNextDocument}
                className="p-1 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.97]"
                title="Next Document (→ or ])"
                aria-label="Next Document"
              >
                <CaretRight size={15} weight="bold" />
              </button>
            </div>
          )}
        </div>

        {/* Center: Pagination & Zoom Controls (for Simulated Documents) */}
        {!isRealPdf && isPdfOrDoc ? (
          <div className="hidden md:flex items-center gap-2 bg-[#01142B] border border-white/15 px-3 py-1.5 rounded-[2px] shadow-sm">
            {/* Page Navigation */}
            <div className="flex items-center gap-1.5 font-mono text-xs text-white/70">
              <span>Page</span>
              <span className="px-2 py-0.5 rounded-[2px] bg-white/[0.08] text-white font-bold min-w-[24px] text-center border border-white/10">
                {currentPage}
              </span>
              <span>/ {totalPages}</span>
            </div>

            <div className="h-4 w-[1px] bg-white/15 mx-1" />

            {/* Page Step Buttons */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-[2px] hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Previous Page (Left Arrow)"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-[2px] hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Next Page (Right Arrow)"
            >
              <CaretRight size={16} weight="bold" />
            </button>

            <div className="h-4 w-[1px] bg-white/15 mx-1" />

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 70}
              className="p-1 rounded-[2px] hover:bg-white/10 disabled:opacity-30 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <MagnifyingGlassMinus size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 text-xs font-mono font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-[2px] transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 160}
              className="p-1 rounded-[2px] hover:bg-white/10 disabled:opacity-30 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <MagnifyingGlassPlus size={16} weight="bold" />
            </button>
          </div>
        ) : null}

        {/* Right: Download & Close Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 hover:border-white/30 transition-colors cursor-pointer"
            title="Print Document"
          >
            <Printer size={16} weight="fill" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[2px] font-sans text-xs font-semibold transition-all duration-150 cursor-pointer min-h-[36px] select-none ${
              downloadSuccess
                ? "bg-emerald-600/25 text-emerald-300 border border-emerald-500 shadow-sm"
                : "bg-[#CC6600] hover:bg-[#E67300] active:bg-[#B35900] text-white border border-[#E67300]/40 shadow-sm"
            }`}
          >
            {downloadSuccess ? (
              <>
                <Check size={15} weight="bold" className="text-emerald-400" />
                <span>Saved</span>
              </>
            ) : isDownloading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <DownloadSimple size={15} weight="bold" />
                <span>Download</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-[2px] text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 hover:border-white/30 transition-colors cursor-pointer select-none"
            title="Close Preview (Esc)"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      </header>

      {/* ── Main Viewport Stage ── */}
      <main
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative bg-[#000814] px-4 sm:px-8 py-8 sm:py-12 flex flex-col items-center"
      >
        {/* Floating Left Page Turn Arrow */}
        {isPdfOrDoc && currentPage > 1 && (
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-[#011B38]/90 backdrop-blur-sm hover:bg-[#02254B] border border-white/20 hover:border-sky-400/50 text-white/70 hover:text-white flex items-center justify-center transition-all shadow-2xl z-30 cursor-pointer hover:scale-105 print:hidden"
            title="Previous Page"
          >
            <CaretLeft size={24} weight="bold" />
          </button>
        )}

        {/* Floating Right Page Turn Arrow */}
        {isPdfOrDoc && currentPage < totalPages && (
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-[#011B38]/90 backdrop-blur-sm hover:bg-[#02254B] border border-white/20 hover:border-sky-400/50 text-white/70 hover:text-white flex items-center justify-center transition-all shadow-2xl z-30 cursor-pointer hover:scale-105 print:hidden"
            title="Next Page"
          >
            <CaretRight size={24} weight="bold" />
          </button>
        )}

        {/* Centering & Scroll Alignment Stage Container */}
        <div
          className={`w-full flex flex-col items-center ${
            isPdfOrDoc || isCsv
              ? "justify-start"
              : "justify-center min-h-full my-auto"
          }`}
        >
          {/* Document Rendering Engine */}
          <div
            className="transition-transform duration-150 flex flex-col items-center w-full max-w-5xl"
            style={
              isPdfOrDoc
                ? {
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                    marginBottom:
                      zoomLevel > 100
                        ? `${((zoomLevel - 100) / 100) * 1100 + 48}px`
                        : undefined,
                  }
                : undefined
            }
          >
            {isRealPdf ? (
              /* ── Real Cloudflare PDF Document Viewer ── */
              <div className="w-full max-w-5xl h-[85vh] bg-[#01142B] border border-white/20 rounded-[2px] shadow-2xl overflow-hidden flex flex-col my-auto">
                <iframe
                  src={realFileUrl!}
                  className="w-full h-full border-none rounded-[2px] bg-white"
                  title={file.fileName}
                />
              </div>
            ) : isPdfOrDoc ? (
              /* ── Google Docs Style Paper Manuscript Page ── */
              <div className="w-full max-w-[800px] min-h-[1050px] bg-white text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-10 sm:p-14 md:p-16 rounded-[2px] border border-slate-300 flex flex-col justify-between select-text">
                {/* Dynamic Document Content Renderer */}
                {(() => {
                  const doc = getDocContent(file.fileName, file.fileCategory);
                  const pageData = doc.pages.find((p) => p.pageNumber === currentPage) || doc.pages[0];

                  return (
                    <div className="flex flex-col gap-6">
                      {/* Header (Page 1 has prominent Title banner, subsequent pages have running header) */}
                      {currentPage === 1 ? (
                        <div className="flex flex-col gap-2">
                          <h1 className="font-sans font-extrabold text-2xl sm:text-3xl text-slate-950 tracking-tight leading-tight">
                            {doc.title}
                          </h1>
                          <h2 className="font-sans font-semibold text-base sm:text-lg text-slate-700 leading-snug">
                            {doc.subtitle}
                          </h2>
                          <p className="font-sans text-xs text-slate-500 mt-1">
                            <strong>Timeline Context:</strong> {doc.context}
                          </p>
                          <hr className="border-t border-slate-300 my-1" />
                        </div>
                      ) : (
                        <div className="border-b border-slate-200 pb-3 flex items-center justify-between text-xs font-mono text-slate-400">
                          <span className="truncate max-w-[70%]">{doc.title}</span>
                          <span>Page {currentPage} of {totalPages}</span>
                        </div>
                      )}

                      {/* Page Sections */}
                      {pageData?.sections.map((sec, idx) => (
                        <section key={idx} className="flex flex-col gap-2.5">
                          <h3 className="font-sans font-bold text-base text-slate-900">
                            {sec.heading}
                          </h3>

                          {sec.paragraphs?.map((p, pIdx) => (
                            <p key={pIdx} className="font-sans text-xs sm:text-sm text-slate-700 leading-relaxed">
                              {p}
                            </p>
                          ))}

                          {sec.listItems && (
                            <ul className="list-disc list-inside font-sans text-xs sm:text-sm text-slate-700 space-y-1.5 pl-2 leading-relaxed">
                              {sec.listItems.map((li, liIdx) => (
                                <li key={liIdx}>
                                  <strong>{li.label}:</strong> {li.text}
                                </li>
                              ))}
                            </ul>
                          )}

                          {sec.callout && (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-[2px] space-y-2 font-sans text-xs sm:text-sm text-slate-800">
                              {sec.callout.map((c, cIdx) => (
                                <p key={cIdx}>
                                  <strong>{c.label}:</strong> {c.text}
                                </p>
                              ))}
                            </div>
                          )}

                          {sec.table && (
                            <div className="border border-slate-300 rounded-[2px] overflow-hidden mt-1">
                              <table className="w-full text-left font-sans text-xs">
                                <thead>
                                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                                    {sec.table.headers.map((th, thIdx) => (
                                      <th key={thIdx} className="p-2.5">{th}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-700">
                                  {sec.table.rows.map((r, rIdx) => (
                                    <tr key={rIdx}>
                                      <td className="p-2.5 font-semibold text-slate-900">{r.col1}</td>
                                      <td className="p-2.5">{r.col2}</td>
                                      <td className="p-2.5 font-mono text-[0.6875rem]">{r.col3}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>
                      ))}
                    </div>
                  );
                })()}

                {/* Page Number Footer */}
                <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs font-mono text-slate-400 mt-8">
                  <span>JAXIS StatLab Academic Registry</span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>
              </div>
            ) : isCsv ? (
              /* ── Google Sheets Style Tabular Dataset Inspector ── */
              <div className="w-full max-w-5xl bg-[#01142B] border border-white/15 rounded-[2px] shadow-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                    <FileCsv size={16} weight="fill" />
                    <span>STRUCTURED DATASET MATRIX (PREVIEW)</span>
                  </div>
                  <span className="text-xs font-mono text-white/50">{file.fileName}</span>
                </div>
                <div className="overflow-x-auto border border-white/10 rounded-[2px]">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="bg-white/[0.06] text-white/60 border-b border-white/10">
                        <th className="p-3">#</th>
                        <th className="p-3">RESPONDENT_ID</th>
                        <th className="p-3">AGE_GROUP</th>
                        <th className="p-3">GENDER</th>
                        <th className="p-3">LIKERT_Q1</th>
                        <th className="p-3">LIKERT_Q2</th>
                        <th className="p-3">SCORE_TOTAL</th>
                        <th className="p-3">VALIDITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-white/85">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                        <tr key={row} className="hover:bg-white/[0.03]">
                          <td className="p-3 text-white/40">{row}</td>
                          <td className="p-3 text-sky-300 font-bold">RESP_{1000 + row}</td>
                          <td className="p-3">{row % 3 === 0 ? "21-25" : "18-20"}</td>
                          <td className="p-3">{row % 2 === 0 ? "Female" : "Male"}</td>
                          <td className="p-3">{(3.5 + (row % 3) * 0.5).toFixed(1)}</td>
                          <td className="p-3">{(4.0 + (row % 2) * 0.4).toFixed(1)}</td>
                          <td className="p-3 font-bold text-amber-400">{(85 + row * 1.2).toFixed(1)}</td>
                          <td className="p-3 text-emerald-400 font-bold">VERIFIED</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isImage ? (
              /* Image Preview */
              <div className="p-4 bg-[#01142B] border border-white/15 rounded-[2px] shadow-2xl flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={realFileUrl || file.filePath}
                  alt={file.fileName}
                  className="max-h-[85vh] max-w-full object-contain rounded-[2px]"
                />
              </div>
            ) : (
              /* Binary Dossier / Application File Card */
              <div
                className="max-w-lg w-full bg-[#01142B] border border-white/15 rounded-[2px] text-center flex flex-col items-center justify-center gap-6 shadow-2xl"
                style={{ padding: "2.5rem 2rem" }}
              >
                <div className="h-16 w-16 rounded-[2px] bg-white/[0.05] border border-white/15 flex items-center justify-center text-sky-400 mb-1">
                  <FileText size={32} weight="fill" />
                </div>
                <div className="flex flex-col items-center gap-2.5 max-w-sm">
                  <h3 className="font-mono font-bold text-base sm:text-lg text-white break-all">
                    {file.fileName}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
                    This document is formatted for desktop statistical applications. Click Download to open locally.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="mt-3 inline-flex items-center gap-2 px-7 py-3 rounded-[2px] bg-gradient-to-b from-[#E67300] to-[#CC6600] text-white border border-[#CC6600] border-t-[#FFA040]/70 border-b-[#994D00] font-mono text-xs font-bold uppercase tracking-wider hover:shadow-[0_2px_12px_rgba(204,102,0,0.4)] transition-all cursor-pointer"
                >
                  <DownloadSimple size={15} weight="bold" />
                  <span>Download Artifact</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );

  return createPortal(content, document.body);
}
