export const FAQS = [
  {
    q: "How fast will I get my analysis?",
    a: "Most thesis and survey studies take 3 to 7 working days. Structural models, medical studies, and multi-wave data take 2 to 3 weeks. If you are close to your deadline, you can add 3-day, 48-hour, or 24-hour delivery.",
  },
  {
    q: "Is working with JAXIS allowed by my school?",
    a: "JAXIS is a statistical consulting service, the same kind of help many universities offer through their own statistics centers. Your research questions, data, and conclusions stay yours. We run and explain the analysis so you understand it and can defend it. Check your school's rules, and let your adviser know you worked with a statistician.",
  },
  {
    q: "What if my adviser or panel asks for changes?",
    a: "Changes within your agreed scope are free. If your adviser asks for different tables, clearer explanations, or extra checks on the same analysis, we update your files at no cost. New tests outside the scope get their own price first.",
  },
  {
    q: "Is my data kept private?",
    a: "Yes. We remove respondent names, emails, and student ID numbers from your dataset before anyone starts work. Every statistician signs a non-disclosure agreement, and your findings stay yours.",
  },
  {
    q: "What if my results are not significant?",
    a: "That is a normal and valid research result. We never change data to get a better p-value. Instead, we report effect sizes and help you explain what the result means, so you can defend it honestly.",
  },
  {
    q: "I don't know much about statistics. How will I defend my results?",
    a: "You don't need to. Every study comes with a plain-English script that explains each Chapter 4 table in simple words, plus answers to the questions panels ask most. You can also book a live DefenseLab practice session.",
  },
  {
    q: "What files will I receive?",
    a: "APA 7th edition tables ready for Word, a plain-English write-up of your findings, your cleaned dataset (.sav or .csv), and the full code in R, Python, or SPSS so the results can be rerun.",
  },
  {
    q: "How do I get started?",
    a: "Create a free account, then send your statement of the problem, method, and data. We reply within 24 hours with a fixed written scope and price. There is no payment or commitment needed to get your price.",
  },
];

export type Testimonial = {
  quote: string;
  name: string;
  program: string;
  school: string;
};

// Add real, permission-granted quotes here. The section stays hidden while this list is empty.
export const TESTIMONIALS: Testimonial[] = [];
