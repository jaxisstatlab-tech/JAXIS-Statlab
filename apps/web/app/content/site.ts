export type Faq = { q: string; a: string; pricing?: boolean };

export const FAQS: Faq[] = [
  {
    pricing: true,
    q: "How fast will I get my analysis?",
    a: "Most thesis and survey studies take 3 to 7 working days. Structural models, medical studies, and multi-wave data take 2 to 3 weeks. If you are close to your deadline, you can add 3-day, 48-hour, or 24-hour delivery.",
  },
  {
    q: "Is working with JAXIS allowed by my school?",
    a: "JAXIS is a statistical consulting service, the same kind of help many universities offer through their own statistics centers. Your research questions, data, and conclusions stay yours. We run and explain the analysis so you understand it and can defend it. Check your school's rules, and let your adviser know you worked with a statistical analyst.",
  },
  {
    pricing: true,
    q: "Do you write Chapter 4 for me?",
    a: "No. JAXIS is a statistical consulting and data analysis service, not a thesis-writing service. We run your statistical tests, format your APA 7th edition tables, and give you a plain-English write-up of your findings and speaking points. You write your own Chapter 4 and discussion using our outputs. This protects your academic integrity and ensures you can confidently defend your study in front of your panel.",
  },
  {
    pricing: true,
    q: "What if my adviser or panel asks for changes?",
    a: "Changes within your agreed scope are free. If your adviser asks for different tables, clearer explanations, or extra checks on the same analysis, we update your files at no cost. New tests outside the scope get their own price first.",
  },
  {
    q: "Is my data kept private?",
    a: "Yes. We remove respondent names, emails, and student ID numbers from your dataset before anyone starts work. Every statistical analyst signs a non-disclosure agreement, and your findings stay yours.",
  },
  {
    q: "What if my results are not significant?",
    a: "That is a normal and valid research result. We never change data to get a better p-value. Instead, we report effect sizes and help you explain what the result means, so you can defend it honestly.",
  },
  {
    q: "I don't know much about statistics. How will I defend my results?",
    a: "You don't need to. Every study comes with a plain-English guide that explains each Chapter 4 table in simple words, plus answers to the questions panels ask most. You can also book a live DefenseLab practice session.",
  },
  {
    q: "What files will I receive?",
    a: "APA 7th edition tables ready for Word, a plain-English write-up of your findings, your cleaned dataset (.sav or .csv), and a signed Certificate of Statistical Audit showing our Statistical Review Editors audited and certified your analysis.",
  },
  {
    pricing: true,
    q: "Is the price I see the price I pay?",
    a: "The pricing page shows typical price ranges, not final prices. You don't need to pick a package: after you send your study, we recommend the one that fits your study and budget, and reply with a fixed written price for your exact scope. That written price is final, with no surprise fees later.",
  },
  {
    pricing: true,
    q: "How do I pay?",
    a: "You can pay by GCash or bank transfer. DataCheck and Start are paid upfront. Larger plans pay a deposit first, then the rest on delivery.",
  },
  {
    pricing: true,
    q: "How do I get started?",
    a: "Create a free account, then send your statement of the problem, method, and data. We reply within 24 hours with a fixed written scope and price. There is no payment or commitment needed to get your price.",
  },
];

export type Testimonial = {
  quote: string;
  /** English version for quotes written in Cebuano. */
  translation?: string;
  /** Empty for groups who asked to stay anonymous. */
  name: string;
  program: string;
  school: string;
  /** The group says they defended their study. */
  defended?: boolean;
};

// Real messages from client groups, kept in their own words (emojis removed). The first one is featured.
// The section stays hidden while this list is empty.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "At first, we didn't know about JAXIS StatLab, but because of a recommendation, we reached out and we're very thankful we did. They offer affordable prices without compromising quality. They guided us to ensure that the service we wanted was aligned with our goals, and they made sure we truly understood the purpose of what we availed. What we appreciate most is that they are approachable and always ready to answer our questions whenever something is unclear. JAXIS StatLab truly helped us with our survey, allowing us to continue our studies with confidence. And in the end, we get the results that we needed.",
    name: "",
    program: "Thesis group",
    school: "",
    defended: true,
  },
  {
    quote:
      "They are very accommodating. Whenever we have inquiries or questions regarding the results, the statistician is always available to explain them in a way that we can easily understand. We would highly recommend JAXIS Lab.",
    name: "Honeylet M. Mañanita, Jane Patrick R. Gamutan, Sophia Loren U. Alegria",
    program: "BSBA Marketing Management",
    school: "Central Mindanao University",
  },
  {
    quote:
      "Na-defend namo among study gamit ang results sa stats ninyu, mas na-clarify pud katung gi-discuss nimo. Pwede kaayo namo ma-recommend inyung StatLab sa next nga mag-thesis next academic year.",
    translation:
      "We defended our study using your stats results, and your explanation made it all clearer. We'd gladly recommend your StatLab to next year's thesis students.",
    name: "",
    program: "Thesis group",
    school: "",
    defended: true,
  },
  {
    quote:
      "We also thank you for guiding us in understanding and analyzing our thesis results. We truly appreciate your support po. Thank you kaayo.",
    name: "Ruthchella Bettina Acosta, Rizamae Oño, Sofia Betina Tare",
    program: "BSBA Financial Management",
    school: "Central Mindanao University",
  },
  {
    quote:
      "Thank you so much, JAXIS StatLab Team! We truly appreciate your support and guidance throughout our research journey. Your assistance has been a huge help in completing our project.",
    name: "Michelle Mae B. Quieta, Fritzy Wendy E. Borja, Sarah Dave L. Dionela",
    program: "Department of Business Administration",
    school: "Central Mindanao University",
  },
  {
    quote: "Thank you so much for this! We already defended our thesis earlier. Thank you sainyung team.",
    name: "Ryan Justine B. Atillo, Daisy Real D. Cambangay, Princess Mei M. Funchica",
    program: "BSBA Marketing Management",
    school: "Central Mindanao University",
    defended: true,
  },
  {
    quote:
      "Thank you so much po saimong help for our statistical analysis, sir. Dako kaayong tabang. Thesis defended mi!",
    translation: "Thank you so much for your help with our statistical analysis. It was a huge help. We defended our thesis!",
    name: "",
    program: "Thesis group",
    school: "",
    defended: true,
  },
  {
    quote:
      "From the bottom of our hearts, thank you, JAXIS StatLab Team, for the support and assistance throughout our research journey, especially to our statistician. We are truly grateful and blessed to have worked with your team.",
    name: "",
    program: "Thesis group",
    school: "",
  },
];

export type HowStep = { tag: string; time: string; title: string; body: string; chips: string[] };

// The five steps of a study, shown in How it works and described to search and AI engines.
export const HOW_STEPS: HowStep[] = [
  {
    tag: "Submit",
    time: "5 minutes",
    title: "Send your study",
    body: "Upload your research questions, survey, and data through your free account.",
    chips: ["Research questions", "Survey", "Data"],
  },
  {
    tag: "Price",
    time: "Under 24 hours",
    title: "Get a fixed price",
    body: "The exact tests, files, and price in writing. No payment needed to ask.",
    chips: ["Tests", "Files", "Price in writing"],
  },
  {
    tag: "Deposit",
    time: "Same day",
    title: "Pay by GCash or bank",
    body: "Work starts as soon as your deposit clears. Larger plans pay the rest on delivery.",
    chips: ["GCash", "Bank transfer"],
  },
  {
    tag: "Analysis",
    time: "3 to 7 days",
    title: "We run and audit it",
    body: "One statistical analyst runs your tests, a second audits them, and a senior reviewer signs off.",
    chips: ["First run", "Audit run", "Senior review"],
  },
  {
    tag: "Delivery",
    time: "Instant",
    title: "Download and defend",
    body: "APA tables, a plain-English write-up, cleaned data, and your defense prep guide.",
    chips: ["APA tables", "Write-up", "Cleaned data", "Defense guide"],
  },
];

export type Deliverable = { name: string; format: string; body: string };

// The five files every study gets (matches "What files will I receive?" in the FAQ).
export const DELIVERABLES: Deliverable[] = [
  { name: "APA tables", format: "DOCX", body: "Every table in APA 7th edition, ready to paste into Word." },
  {
    name: "Findings summary",
    format: "DOCX",
    body: "Each result explained in plain English, so you can write your own Chapter 4.",
  },
  { name: "Cleaned dataset", format: "SAV · CSV", body: "Your data, cleaned and labeled, ready to reopen." },
  {
    name: "Certificate of Statistical Audit",
    format: "PDF",
    body: "Signed proof that our Statistical Review Editors audited your analysis and certified it. Show it to your adviser or panel.",
  },
  { name: "Defense guide", format: "PDF", body: "The questions panels ask most, answered in plain English." },
];
