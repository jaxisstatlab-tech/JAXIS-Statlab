/**
 * JAXIS — Module 09: Communication Firewall Engine
 *
 * Scans all incoming message content before database persistence.
 * If prohibited contact info, off-platform messaging channels, payment handles,
 * external URLs, or intentional evasion attempts (leetspeak, repeated characters,
 * character spacing, spelled-out digits) are detected, the message is blocked in full.
 */

export interface FirewallDetection {
  ruleName: string;
  category: "EMAIL" | "PHONE" | "PAYMENT" | "MESSENGER" | "SOCIAL" | "URL" | "OFF_PLATFORM";
  label: string;
  matchedText: string;
}

export type FirewallResult =
  | { blocked: false }
  | { blocked: true; detection: FirewallDetection };

interface ProhibitedRule {
  ruleName: string;
  category: FirewallDetection["category"];
  label: string;
  regex: RegExp;
}

export const PROHIBITED_RULES: ProhibitedRule[] = [
  {
    ruleName: "EMAIL_ADDRESS",
    category: "EMAIL",
    label: "Email Address",
    regex: /(?:[a-zA-Z0-9._%+-]+\s*(?:@|\[at\]|\(at\))\s*[a-zA-Z0-9.-]+\s*(?:\.|\bdot\b|\[dot\]|\(dot\))\s*[a-zA-Z]{2,}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  },
  {
    ruleName: "PH_MOBILE",
    category: "PHONE",
    label: "Philippine Mobile Number",
    regex: /(?:(?:\+?63|0)[\s.-]?9[\d\s.-]{8,14}\b|\b09\d{9}\b|\b\+639\d{9}\b)/g,
  },
  {
    ruleName: "E_WALLET_PAYMENT",
    category: "PAYMENT",
    label: "Direct Payment / E-Wallet",
    regex: /\b(gcash|paymaya|maya|paypal|coins\.ph|dragonpay|binance|bdo|bpi|metrobank|unionbank|seabank|gotyme|bank transfer|wire transfer|direct deposit)\b/gi,
  },
  {
    ruleName: "MESSAGING_APP",
    category: "MESSENGER",
    label: "External Messaging App",
    regex: /(?:\b(whatsapp|viber|telegram|messenger|imessage|signal|wechat|skype|kakao|line app|vbr)\b|(?:wa\.me|t\.me|m\.me|viber\.me)\/\S+)/gi,
  },
  {
    ruleName: "SOCIAL_PLATFORM",
    category: "SOCIAL",
    label: "Social Media Platform",
    regex: /\b(facebook|instagram|twitter|tiktok|snapchat|discord|linkedin|fb|ig)\b/gi,
  },
  {
    ruleName: "SOCIAL_HANDLE",
    category: "SOCIAL",
    label: "Social Media Handle",
    regex: /(?:^|\s)@[a-zA-Z0-9_.]{2,30}\b/g,
  },
  {
    ruleName: "OFF_PLATFORM_INTENT",
    category: "OFF_PLATFORM",
    label: "Off-Platform Contact Intent",
    regex: /\b(?:chat|pm|message|contact|text|call|reach)\s+(?:me\s+)?(?:at|on|in|thru|via)\b/gi,
  },
  {
    ruleName: "EXTERNAL_URL",
    category: "URL",
    label: "External URL / Link",
    regex: /https?:\/\/(?!(?:[a-zA-Z0-9-]+\.)*jaxis\.(?:dev|local|com|io|net))[\w\-.]+\.[a-zA-Z]{2,}(?::\d+)?(?:\/\S*)?/gi,
  },
  {
    ruleName: "WWW_URL",
    category: "URL",
    label: "External Web Address",
    regex: /\bwww\.(?!(?:[a-zA-Z0-9-]+\.)*jaxis\.(?:dev|local|com|io|net))[\w\-.]+\.[a-zA-Z]{2,}(?::\d+)?(?:\/\S*)?/gi,
  },
];

/**
 * 1. Converts leetspeak and symbol substitutions to standard ASCII lowercase.
 */
function normalizeLeetspeak(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@4^]/g, "a")
    .replace(/[8]/g, "b")
    .replace(/[(<[{]/g, "c")
    .replace(/[3€]/g, "e")
    .replace(/[!|1]/g, "i")
    .replace(/[0*]/g, "o")
    .replace(/[$5§]/g, "s")
    .replace(/[7+]/g, "t")
    .replace(/(?:\/\/|\\\\)/g, "w")
    .replace(/%/g, "x")
    .replace(/[2]/g, "z");
}

/**
 * 2. Collapses excessive consecutive repeated characters (e.g. 'faceboook' -> 'facebook').
 */
function collapseRepeatedChars(text: string): string {
  return text
    .replace(/(.)\1{2,}/g, (match, char) => {
      if (char === "o" || char === "e") return char + char; // Preserve valid double letters like 'oo' in facebook
      return char;
    })
    .replace(/f+a+c+e+b+o+o*k+/gi, "facebook")
    .replace(/m+e+s+s+e+n+g+e+r+/gi, "messenger")
    .replace(/w+h+a+t+s+a+p+p+/gi, "whatsapp")
    .replace(/t+e+l+e+g+r+a+m+/gi, "telegram")
    .replace(/v+i+b+e+r+/gi, "viber")
    .replace(/g+c+a+s+h+/gi, "gcash")
    .replace(/p+a+y+m+a+y+a+/gi, "paymaya")
    .replace(/m+a+y+a+/gi, "maya")
    .replace(/i+n+s+t+a+g+r+a+m+/gi, "instagram")
    .replace(/t+w+i+t+t+e+r+/gi, "twitter")
    .replace(/t+i+k+t+o+k+/gi, "tiktok")
    .replace(/d+i+s+c+o+r+d+/gi, "discord");
}

/**
 * 3. Strips punctuation, spaces, dots, dashes between single characters (e.g. 'f a c e b o o k' -> 'facebook').
 */
function stripIntersperseDelimiters(text: string): string {
  const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  return clean.replace(/([a-zA-Z0-9])[\s._\-~*#]+(?=[a-zA-Z0-9])/g, "$1");
}

/**
 * 4. Normalizes written English and Tagalog spelled-out digits (e.g. 'zero nine one seven' -> '0917').
 */
function normalizeWordDigits(text: string): string {
  const digitMap: Record<string, string> = {
    zero: "0", oh: "0", zeroo: "0",
    one: "1", isa: "1",
    two: "2", dalawa: "2",
    three: "3", tatlo: "3",
    four: "4", apat: "4",
    five: "5", lima: "5",
    six: "6", anim: "6",
    seven: "7", pito: "7",
    eight: "8", walo: "8",
    nine: "9", siyam: "9",
  };

  return text.toLowerCase().replace(/\b(zero|oh|one|isa|two|dalawa|three|tatlo|four|apat|five|lima|six|anim|seven|pito|eight|walo|nine|siyam)\b/gi, (match) => {
    return digitMap[match.toLowerCase()] || match;
  });
}

/**
 * Executes multi-pass server-side firewall inspection against raw message text
 * and evasion-normalized variants.
 */
export function runFirewall(rawContent: string): FirewallResult {
  if (!rawContent || !rawContent.trim()) {
    return { blocked: false };
  }

  // Multi-pass normalization pipeline for evasion deterrence
  const passes: Array<{ name: string; text: string }> = [
    { name: "RAW", text: rawContent },
    { name: "LEETSPEAK", text: normalizeLeetspeak(rawContent) },
    { name: "COLLAPSED", text: collapseRepeatedChars(normalizeLeetspeak(rawContent)) },
    { name: "STRIPPED_DELIMITERS", text: collapseRepeatedChars(stripIntersperseDelimiters(normalizeLeetspeak(rawContent))) },
    { name: "WORD_DIGITS", text: stripIntersperseDelimiters(normalizeWordDigits(rawContent)) },
  ];

  for (const { text } of passes) {
    for (const rule of PROHIBITED_RULES) {
      rule.regex.lastIndex = 0; // Reset stateful regex cursor
      const match = rule.regex.exec(text);
      if (match) {
        const matchedText = match[0].trim();
        return {
          blocked: true,
          detection: {
            ruleName: rule.ruleName,
            category: rule.category,
            label: rule.label,
            matchedText,
          },
        };
      }
    }
  }

  return { blocked: false };
}

/**
 * Generates user-friendly, plain English violation notice.
 */
export function getFirewallWarningMessage(ruleName: string): string {
  switch (ruleName) {
    case "EMAIL_ADDRESS":
      return "Please don't share email addresses here. Keep all talk about your study in this chat.";
    case "PH_MOBILE":
      return "Please don't share phone numbers here. Keep all talk about your study in this chat.";
    case "E_WALLET_PAYMENT":
      return "Please don't send or ask for payments in chat (GCash, Maya, bank transfer). Pay only through your study's payment page.";
    case "MESSAGING_APP":
      return "Please don't move the chat to other apps like WhatsApp, Viber, Telegram, or Messenger. Keep it here so everything stays on record.";
    case "SOCIAL_PLATFORM":
    case "SOCIAL_HANDLE":
      return "Please don't share social media links or usernames here.";
    case "OFF_PLATFORM_INTENT":
      return "Please keep the conversation in this chat so everything stays on record.";
    case "EXTERNAL_URL":
    case "WWW_URL":
      return "Links can't be sent in chat. Upload files on your study page instead.";
    default:
      return "This message wasn't sent because it looks like it has contact details. Please keep the conversation in this chat.";
  }
}
