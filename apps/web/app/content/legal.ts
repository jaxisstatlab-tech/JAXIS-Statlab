// Copy for /privacy and /terms. Built from the business rules in apps/app/docs/info (scope, data storage).
// "{email}" inside a paragraph or list item renders as a link to the contact email.

export type LegalBlock = string | { list: string[] };
export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  updated: "September 26, 2026",
  intro:
    "This page explains what information JAXIS StatLab collects when you use this website and our study platform, why we need it, and how you stay in control of it. We follow the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).",
  sections: [
    {
      id: "what-we-collect",
      title: "What we collect",
      blocks: [
        {
          list: [
            "Account details: your name, email address, and password. Passwords are stored as a secure hash, so no one at JAXIS can read them.",
            "Study materials: your research title, research questions, method notes, datasets, questionnaires, and any documents you upload.",
            "Payment records: amounts paid and the GCash or bank transfer receipts you upload. We never ask for your GCash PIN or bank login.",
            "Messages you send to our team inside the platform.",
            "DefenseLab recordings, if you book a mock panel session.",
            "Website visits: anonymous page-view counts through Vercel Analytics, which does not use cookies or identify you.",
          ],
        },
      ],
    },
    {
      id: "how-we-use-it",
      title: "How we use it",
      blocks: [
        "We use your information to price and run your analysis, deliver your files, confirm your payments, answer your questions, keep the service secure, and meet our tax and accounting duties.",
        "We do not sell your information, and we do not use it for advertising.",
      ],
    },
    {
      id: "how-we-protect-it",
      title: "How we protect your study",
      blocks: [
        {
          list: [
            "We remove respondent names, email addresses, and student ID numbers from your dataset before anyone starts work.",
            "Every statistician signs a non-disclosure agreement.",
            "Your files are kept in private storage. Download links expire after one hour.",
            "Team members can only see the studies they are assigned to.",
          ],
        },
      ],
    },
    {
      id: "who-we-share-with",
      title: "Who we share it with",
      blocks: [
        {
          list: [
            "The statisticians and reviewers assigned to your study.",
            "Companies that host our systems, only so the service can run: Supabase (database), Cloudflare (file storage), Vercel (website hosting), and our email provider.",
            "Government authorities, only when the law requires it.",
          ],
        },
        "We never contact your school, adviser, or panel about your study unless you ask us to.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      title: "How long we keep it",
      blocks: [
        "Study files are deleted 90 days after your project is completed. Signed agreements and payment records are kept longer, because tax and accounting laws require it. Your account details stay while your account is active.",
      ],
    },
    {
      id: "your-rights",
      title: "Your rights",
      blocks: [
        "Under the Data Privacy Act you can ask to see the information we hold about you, correct it, get a copy of it, object to how it is used, or have it deleted. You can also file a complaint with the National Privacy Commission.",
        "To make a request, email {email}. When we delete your data, we remove everything except the agreements and payment records the law requires us to keep.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and browser storage",
      blocks: [
        "This website uses no advertising or tracking cookies. It saves small settings in your browser, like whether you have already seen the opening animation. The study platform uses a sign-in cookie to keep you logged in.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      blocks: [
        "When we update this policy, we change the date at the top of this page. If a change affects how we use your study data, we will email account holders before it takes effect.",
      ],
    },
    {
      id: "contact",
      title: "Contact us",
      blocks: ["Questions about your privacy? Email {email} and we will reply."],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: "Terms of Service",
  updated: "September 26, 2026",
  intro:
    "These terms explain how working with JAXIS StatLab works: what we do, how pricing and payment work, and what happens if something goes wrong. By using this website or our study platform, you agree to them.",
  sections: [
    {
      id: "what-we-do",
      title: "What we do",
      blocks: [
        "JAXIS StatLab is a statistical consulting service. We run, check, and explain the analysis for your study. Your research questions, data, and conclusions stay yours.",
      ],
    },
    {
      id: "academic-honesty",
      title: "Academic honesty",
      blocks: [
        "We never make up data or change data to get a better result. If a request asks for that, we will decline the study and refund any payment.",
        "You are responsible for following your school's rules about outside help. We recommend telling your adviser that you worked with a statistician.",
      ],
    },
    {
      id: "prices-and-scope",
      title: "Prices and your written scope",
      blocks: [
        "Prices on this website are starting points. After we review your study, we send a written scope of work with your final price, files, and delivery date. You accept it by typing your full name.",
        "Once signed, the scope is locked. Any change to it needs a new written agreement.",
      ],
    },
    {
      id: "payment",
      title: "Payment",
      blocks: [
        {
          list: [
            "You can pay by GCash or bank transfer.",
            "DataCheck and Start are paid upfront. Larger plans pay a deposit first, then the rest on delivery.",
            "Your deposit is held until your study passes our quality review.",
            "A request that stays unpaid for 3 days expires. You can send it again anytime.",
          ],
        },
      ],
    },
    {
      id: "delivery",
      title: "Delivery times",
      blocks: [
        "Your delivery date is in your written scope. The timer starts once a statistician is assigned, and it counts weekends but not holidays. If we need more information from you, the timer pauses until you reply.",
        "If we miss a Rush, Express, or Emergency deadline, we refund the faster delivery fee.",
      ],
    },
    {
      id: "revisions",
      title: "Revisions",
      blocks: [
        "Each study includes one round of changes, requested within 3 business days after delivery. This covers changes within your scope, like fixing variable names or adjusting how findings are written.",
        "New tests, a different method, or a bigger scope are new work. They get their own written price before we start.",
      ],
    },
    {
      id: "refunds",
      title: "Refunds",
      blocks: [
        "You get a full refund if we did not follow the method in your written scope, or if we made a math error you can verify. Refund requests must be filed within 7 days of delivery.",
        "Disagreements about academic judgment, like a panel preferring a different approach, do not qualify. We do not give partial refunds.",
        "If you dispute a payment with your bank or GCash, work on your study pauses until the dispute is settled.",
      ],
    },
    {
      id: "defenselab",
      title: "DefenseLab sessions",
      blocks: [
        {
          list: [
            "DefenseLab is a 1-on-1 mock panel with a senior statistician, at ₱250 per hour, paid before scheduling.",
            "To reschedule, tell us at least 12 hours before the session. A late change or a missed session counts as used.",
            "Sessions are recorded, and you receive the recording.",
          ],
        },
      ],
    },
    {
      id: "communication",
      title: "Talking with your statistician",
      blocks: [
        "All messages with your statistician stay inside the platform. Messages that share personal phone numbers, emails, social media accounts, or payment details are blocked, to protect you and your payment.",
      ],
    },
    {
      id: "changes",
      title: "Changes to these terms",
      blocks: [
        "When we update these terms, we change the date at the top of this page. The terms in effect when you signed your written scope apply to that study.",
      ],
    },
    {
      id: "contact",
      title: "Contact us",
      blocks: ["Questions about these terms? Email {email}."],
    },
  ],
};
