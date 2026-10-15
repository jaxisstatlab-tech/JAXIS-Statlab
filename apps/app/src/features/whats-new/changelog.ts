// What's new: the update log shown in the app (sidebar "What's new" → /dashboard/whats-new).
//
// To publish an update, add a release at the TOP of RELEASES:
//   - id: the release date, "YYYY-MM-DD" (newest first; a second release on the same day gets "-2").
//   - items, each written so someone who wasn't in the meeting understands it:
//       where: the page, as the person finds it, from the sidebar down, e.g. ["My studies", "a study", "Price"]
//              (shown as a highlighted trail so they know where to look);
//       title: a short headline of what changed ("Pay the deposit or the full amount");
//       text:  one or two plain sentences: what you'll see now and why it helps. No staff jargon or code names.
//   - roles: who sees the item. "ALL" = everyone. The CEO always sees every item.
// A release with nothing for someone's role is hidden for them. The orange dot in the sidebar shows until the
// person opens the page after the newest release they can see.

export type Role = "CLIENT" | "STATISTICIAN" | "SENIOR_QA_LEAD" | "ADMIN" | "FINANCE_OFFICER" | "CEO";
export type Audience = Role | "ALL";
export type ChangeKind = "new" | "improved" | "fixed";

export interface ChangeItem {
  kind: ChangeKind;
  /** Where to find it, sidebar first: ["My studies", "a study", "Price"]. */
  where?: string[];
  /** Short headline. Older entries have only `text`. */
  title?: string;
  text: string;
  roles: Audience[];
}

export interface Release {
  id: string;
  version: string;
  date: string;
  title: string;
  items: ChangeItem[];
}

const STAFF_STUDY: Audience[] = ["STATISTICIAN", "SENIOR_QA_LEAD"];

export const RELEASES: Release[] = [
  {
    id: "2026-10-15",
    version: "1.6",
    date: "October 15, 2026",
    title: "Client feedback, declined quotes and staff workload",
    items: [
      {
        kind: "new",
        where: ["My studies", "a finished study", "How did we do?"],
        title: "Tell us how your study went",
        text: "Once your study is finished, its page asks for a rating from 1 to 5 and two short, optional questions. You choose whether your words can appear on our website, and whether it's with your names or anonymous (just your program and school). You can change your answer for 7 days. We also send one email to ask, and one reminder.",
        roles: ["CLIENT"],
      },
      {
        kind: "new",
        where: ["My Studies", "a delivered study", "View Details"],
        title: "See what the client said",
        text: "When a client rates a study you worked on, you get a notification, and the study's details show their rating and comments.",
        roles: STAFF_STUDY,
      },
      {
        kind: "new",
        where: ["Client Feedback"],
        title: "Every client's feedback in one place",
        text: "The new Client Feedback page shows the average rating, every answer, and who is still to reply. A rating of 1 or 2 sends you a notification and an email so you can follow up the same day. Answers the client allowed on the website have a Show on Website button; nothing goes on the website until you press it.",
        roles: ["ADMIN"],
      },
      {
        kind: "new",
        where: ["Overview", "Client happiness"],
        title: "Client happiness on your overview",
        text: "Your overview shows the average client rating, how the ratings spread from 1 to 5, and the latest comment, with a link to every answer.",
        roles: ["CEO"],
      },
      {
        kind: "improved",
        where: ["Log in"],
        title: "Clearer messages when logging in doesn't work",
        text: "The login page now tells you what to fix: an empty or mistyped email, Caps Lock being on, or a space at the start or end of your password. After a few wrong tries it warns you before logging in pauses for 15 minutes, and links straight to resetting your password. Phones also no longer capitalise or autocorrect what you type.",
        roles: ["ALL"],
      },
      {
        kind: "new",
        where: ["Studies", "a study", "Overview", "Price and agreement"],
        title: "See why a client declined the quote",
        text: "When a client asks for changes, their reason now shows under the quote, in their own words. It's also at the top of the quote window.",
        roles: ["ADMIN"],
      },
      {
        kind: "fixed",
        where: ["Studies", "a study", "Make a New Quote"],
        title: "Make a new quote after a decline",
        text: "A declined quote used to open locked, with no way forward. Now the quote window shows the client's reason and a Make a New Quote button. It starts from the declined quote, so you only change what they asked for, then save it or send it. The declined quote stays as it was.",
        roles: ["ADMIN"],
      },
      {
        kind: "fixed",
        where: ["Assign Teams"],
        title: "Delivered studies no longer count as current work",
        text: "A study that was already delivered still showed under a person's active studies, counted toward their load, and could show as overdue. Now only studies still being worked on count.",
        roles: ["ADMIN"],
      },
      {
        kind: "fixed",
        where: ["Staff Directory"],
        title: "Correct study counts for each person",
        text: "Each analyst's and reviewer's count now includes only the studies they're working on now, not ones already delivered.",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    id: "2026-10-14",
    version: "1.5",
    date: "October 14, 2026",
    title: "Easier study requests, fixed prices and reviewer offers",
    items: [
      // ── Clients ──
      {
        kind: "new",
        where: ["Send a new study"],
        title: "Sending a study now takes four short steps",
        text: "Study, Package, Files, Send. The long form is split up so it's easier to fill in, and you can go back to any step before sending.",
        roles: ["CLIENT"],
      },
      {
        kind: "new",
        where: ["Send a new study", "Package"],
        title: "Choose your package and add-ons, with prices",
        text: "Pick the package you'd like and any add-ons, and see what each costs. Not sure? Choose \"Let JAXIS pick\". Our team may adjust it after reading your study.",
        roles: ["CLIENT"],
      },
      {
        kind: "new",
        where: ["Send a new study", "Package"],
        title: "Faster delivery is picked for you when your date is close",
        text: "If the date you need it by is sooner than the package usually takes, Rush, Express or Emergency is selected for you. You can change it.",
        roles: ["CLIENT"],
      },
      {
        kind: "new",
        where: ["Send a new study", "Study"],
        title: "Add notes for our team",
        text: "An optional box for anything we should know. Your analyst and reviewer can read it too.",
        roles: ["CLIENT"],
      },
      {
        kind: "improved",
        where: ["My studies", "a study", "Price"],
        title: "Your price is fixed as our team sent it",
        text: "The delivery speed and extras are now set by our team and shown as part of the price. Want something different, like faster delivery? Click Ask for Changes and we'll send a new price.",
        roles: ["CLIENT"],
      },
      {
        kind: "improved",
        where: ["My studies", "a study", "Agreement"],
        title: "The agreement shows the right delivery time",
        text: "With a faster delivery add-on it says that add-on's days, for example \"2 days (Express)\". Without one it says the package's usual working days.",
        roles: ["CLIENT"],
      },
      {
        kind: "new",
        where: ["My studies", "a study", "Payment"],
        title: "Pay the deposit or the full amount",
        text: "When it's time to pay the deposit, you can choose to pay everything at once instead. Then there's nothing left to pay when your files are ready.",
        roles: ["CLIENT"],
      },
      {
        kind: "improved",
        title: "New wording on the Certificate of Statistical Audit",
        text: "The certificate that comes with the finished files has clearer, numbered sections and the study ID at the bottom.",
        roles: ["CLIENT", "SENIOR_QA_LEAD", "ADMIN"],
      },
      {
        kind: "improved",
        title: "Research objectives and Statement of the problem are labelled correctly",
        text: "Research objectives is your numbered list; Statement of the problem is your paragraph. The two labels were swapped before and are now right on every page.",
        roles: ["CLIENT", "STATISTICIAN", "SENIOR_QA_LEAD", "ADMIN"],
      },

      // ── Analysts and reviewers ──
      {
        kind: "new",
        where: ["My Studies", "All my studies"],
        title: "See when each study was assigned to you",
        text: "A new Assigned column shows the date and time. Sort by \"Oldest assigned\" to see which came first. It's also in each study's Details window.",
        roles: ["STATISTICIAN"],
      },
      {
        kind: "new",
        where: ["Review Desk", "All my studies"],
        title: "See when each study was assigned to you",
        text: "A new Assigned column shows the date and time. Sort by \"Oldest assigned\" to see which came first. It's also in each study's Details window.",
        roles: ["SENIOR_QA_LEAD"],
      },
      {
        kind: "new",
        where: ["Open Studies"],
        title: "Offer to review studies before they're assigned",
        text: "Open Studies is now in your sidebar. Read a study that has no team yet and click I'll Take It to offer to review it. Offer on as many as you like; if an admin doesn't pick someone else, the first reviewer who offered gets it when the client pays.",
        roles: ["SENIOR_QA_LEAD"],
      },
      {
        kind: "new",
        where: ["Open Studies", "Details"],
        title: "Read the client's notes before you offer",
        text: "Notes the client wrote when sending the study now show on Open Studies, your workbench and the review page.",
        roles: STAFF_STUDY,
      },

      // ── Admins ──
      {
        kind: "new",
        where: ["Studies"],
        title: "See what the client asked for",
        text: "Each study shows the client's preferred package, add-ons and notes. Build Quote starts from them, so you only adjust what's needed.",
        roles: ["ADMIN"],
      },
      {
        kind: "new",
        where: ["Studies", "the offers tag on a study"],
        title: "Reviewers can offer too",
        text: "The window now has two lists, Analysts and Reviewers. Pick one of each, or leave it: the first to offer is used when the deposit clears.",
        roles: ["ADMIN"],
      },
      {
        kind: "fixed",
        where: ["Studies", "a study", "Team", "Change"],
        title: "The Assign Teams window stays still",
        text: "It no longer flickers or resets the person you picked. Analysts and reviewers who offered are listed first, tagged Picked or Offered.",
        roles: ["ADMIN"],
      },

      // ── CEO ──
      {
        kind: "new",
        where: ["Money & Pay Rates", "Edit Prices & Packages"],
        title: "Set how long each package and delivery speed takes",
        text: "\"Usual time (working days)\" per package and \"Ready in (days)\" per speed. The client's form and the agreement use these numbers.",
        roles: ["CEO"],
      },
      {
        kind: "improved",
        where: ["Overview", "Still owed"],
        title: "See money waiting for a signature",
        text: "The card adds prices clients have accepted but whose agreement isn't signed yet. It moves into Still owed once they sign.",
        roles: ["CEO"],
      },

      // ── Everyone ──
      {
        kind: "improved",
        where: ["Sidebar"],
        title: "Clearer names in the sidebar",
        text: "Links are renamed to match the page they open, so it's easier to find things.",
        roles: ["ALL"],
      },
    ],
  },
  {
    id: "2026-10-08",
    version: "1.4",
    date: "October 8, 2026",
    title: "Payments, quotes and profiles",
    items: [
      { kind: "fixed", text: "Sending your payment details works again. If one didn't go through, you can send it again.", roles: ["CLIENT"] },
      {
        kind: "new",
        text: "Payments to Check: every payment to confirm in one list, oldest first, with who checked each one.",
        roles: ["FINANCE_OFFICER", "ADMIN"],
      },
      {
        kind: "fixed",
        text: "A payment can no longer be confirmed twice, or sent back after it was confirmed.",
        roles: ["FINANCE_OFFICER", "ADMIN"],
      },
      { kind: "new", text: "Add a profile photo and edit your first and last name in My Profile.", roles: ["ALL"] },
      { kind: "new", text: "Open Studies: offer to take a study that doesn't have an analyst yet.", roles: ["STATISTICIAN"] },
      {
        kind: "improved",
        text: "New Quotes page and a simpler quote window; the DefenseLab page and study pages were redesigned.",
        roles: ["ADMIN"],
      },
      { kind: "improved", text: "A cleaner file viewer, with arrows to move between files.", roles: ["ALL"] },
    ],
  },
  {
    id: "2026-10-07",
    version: "1.3",
    date: "October 7, 2026",
    title: "New analyst and reviewer desks",
    items: [
      { kind: "improved", text: "My Studies and the study workbench were rebuilt, and file uploads now save properly.", roles: ["STATISTICIAN"] },
      {
        kind: "improved",
        text: "The Review Desk and review page were rebuilt. Draw your signature in My Profile before approving.",
        roles: ["SENIOR_QA_LEAD"],
      },
      { kind: "new", text: "My Earnings shows your study pay, worked out the same way as your payslip.", roles: STAFF_STUDY },
    ],
  },
  {
    id: "2026-10-02",
    version: "1.2",
    date: "October 2, 2026",
    title: "Payments and pay",
    items: [
      {
        kind: "fixed",
        text: "The Payment tab now shows our GCash and bank details. Pay with just the reference number; a screenshot is optional.",
        roles: ["CLIENT"],
      },
      { kind: "new", text: "Sign in with Google.", roles: ["ALL"] },
      { kind: "improved", text: "Our emails have a cleaner, easier-to-read design.", roles: ["ALL"] },
      { kind: "improved", text: "Your agreement is signed by the JAXIS staff member who prepared it.", roles: ["CLIENT", "ADMIN"] },
      {
        kind: "improved",
        text: "Finance Overview now shows real numbers, and our GCash and bank details can be edited in one place.",
        roles: ["FINANCE_OFFICER"],
      },
      { kind: "fixed", text: "Payroll saves properly and pays only for work that was really done.", roles: ["FINANCE_OFFICER"] },
      {
        kind: "improved",
        text: "Only staff paid by the hour use the time clock now; Staff Timesheets and Payroll Settings were redesigned.",
        roles: ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"],
      },
      {
        kind: "improved",
        text: "CEO Overview shows real numbers. Pay rates, prices and payment details now save properly, and you can delete an account to free its email.",
        roles: ["CEO"],
      },
      { kind: "improved", text: "The Staff Directory was redesigned.", roles: ["ADMIN"] },
    ],
  },
  {
    id: "2026-10-01",
    version: "1.1",
    date: "October 1, 2026",
    title: "Faster and safer",
    items: [
      { kind: "improved", text: "Pages open faster: the app now runs next to its database and loads most pages in one step.", roles: ["ALL"] },
      {
        kind: "new",
        text: "When you send a study, tell us what the analysis should do (describe, compare groups, test relationships, predict).",
        roles: ["CLIENT"],
      },
      {
        kind: "new",
        text: "Every study shows what the client wants the analysis to do, to help choose the right tests and price.",
        roles: ["STATISTICIAN", "SENIOR_QA_LEAD", "ADMIN"],
      },
      { kind: "improved", text: "Add or remove your study files any time before you sign the agreement.", roles: ["CLIENT"] },
      { kind: "fixed", text: "Extra checks keep every client's studies and files private to their own account.", roles: ["CLIENT"] },
      {
        kind: "fixed",
        text: "On phones, Messages no longer marks a chat as read before you open it.",
        roles: ["CLIENT", "STATISTICIAN", "SENIOR_QA_LEAD", "ADMIN"],
      },
    ],
  },
  {
    id: "2026-09-28",
    version: "1.0",
    date: "September 28, 2026",
    title: "JAXIS StatLab is live",
    items: [
      {
        kind: "new",
        text: "Send your study and files, get a fixed written price, sign the agreement, pay, and download your results and certificate, all in one place.",
        roles: ["CLIENT"],
      },
      { kind: "new", text: "See where your study is at every step, from price to final files.", roles: ["CLIENT"] },
      {
        kind: "new",
        text: "Messages: one chat per study with everyone working on it, with online dots and search.",
        roles: ["CLIENT", "STATISTICIAN", "SENIOR_QA_LEAD", "ADMIN"],
      },
      { kind: "new", text: "Book DefenseLab practice sessions to prepare for your defense.", roles: ["CLIENT"] },
      { kind: "new", text: "Ask for changes after delivery from Revisions & help.", roles: ["CLIENT"] },
      { kind: "new", text: "Notifications for every step, in the app and by email. Forgot your password? Reset it by email.", roles: ["ALL"] },
      {
        kind: "new",
        text: "Approve finished studies and issue the Certificate of Statistical Audit with your signature.",
        roles: ["SENIOR_QA_LEAD"],
      },
      {
        kind: "new",
        text: "Studies, quotes, agreements, payments and team assignments in one workspace.",
        roles: ["ADMIN"],
      },
      {
        kind: "new",
        text: "Leave requests and payslips in the staff portal.",
        roles: ["STATISTICIAN", "SENIOR_QA_LEAD", "FINANCE_OFFICER", "ADMIN"],
      },
    ],
  },
];

export const KIND_LABEL: Record<ChangeKind, string> = { new: "Added", improved: "Improved", fixed: "Fixed" };

export const ROLE_LABEL: Record<Role, string> = {
  CLIENT: "Clients",
  STATISTICIAN: "Analysts",
  SENIOR_QA_LEAD: "Reviewers",
  ADMIN: "Admins",
  FINANCE_OFFICER: "Finance",
  CEO: "CEO",
};

const sees = (role: string | undefined, item: ChangeItem) =>
  role === "CEO" || item.roles.includes("ALL") || (!!role && item.roles.includes(role as Role));

/** The releases someone sees, each with only the items for their role (the CEO sees everything). */
export function releasesFor(role?: string): Release[] {
  return RELEASES.map((r) => ({ ...r, items: r.items.filter((i) => sees(role, i)) })).filter((r) => r.items.length > 0);
}

/** Id of the newest release someone sees, or null. */
export function latestReleaseId(role?: string): string | null {
  return releasesFor(role)[0]?.id ?? null;
}

/** Browser storage key for the newest release this person has opened (per account, per device). */
export const seenKey = (email?: string) => `jaxis:whats-new-seen:${(email || "anon").toLowerCase()}`;
export const SEEN_EVENT = "jaxis:whats-new-seen";
