# JAXIS — Module 09: Messaging & Communication Firewall

**Module Code:** `09-messaging`\
**Domain:** Messaging\
**Depends On:** `04-intake`, `08-assignment`\
**Blocks:** `10-analysis`\
**Realtime:** Supabase Realtime channels (`project:{projectId}`)

---

## 1. Module Identity

- **Primary Objective:** All client–Expert communication happens inside JAXIS. A server-side firewall detects prohibited external contact information (email, phone, GCash, social handles) and **blocks the entire message** — it is not delivered, not sanitized, and not editable. Admin can audit all blocked messages.
- **Core Responsibilities:** `Message` model, communication firewall regex engine, real-time messaging (polling or WebSocket), `BlockedMessageLog`, Admin blocked-message review queue.

---

## 2. Module Scope

### ✅ In Scope

| Feature ID | Feature |
|---|---|
| `MSG-F01` | **Project-scoped messaging** — Each project has its own thread; messages are scoped to the project participants (Client, assigned Statistician, Admin) |
| `MSG-F02` | **Communication firewall** — Server-side regex scan on content before persistence; matched messages are fully blocked |
| `MSG-F03` | **Full block (not sanitization)** — Blocked message saved with `is_blocked = true`; sender sees a block notification; recipient sees nothing |
| `MSG-F04` | **Prohibited pattern detection** — Email addresses, Philippine phone numbers, GCash/Maya/PayMaya/PayPal, WhatsApp/Viber/Telegram/Messenger/Facebook/Instagram/Twitter mentions, external URLs, `@` social handles |
| `MSG-F05` | **Admin blocked message queue** — Admin sees all blocked messages across all projects: content, sender, pattern detected, review status |
| `MSG-F06` | **Admin review** — Admin marks a blocked message as reviewed (no unblocking — block is permanent) |
| `MSG-F07` | **Message thread** — Participants see non-blocked messages in chronological order |
| `MSG-F08` | **Role labeling** — Messages show sender role label (Client / Statistician / Admin), not just name |
| `MSG-F09` | **Real-time delivery** — Supabase Realtime WebSocket channel per project (`project:{projectId}`); client subscribes via `supabase-js`; server broadcasts on new message via Supabase REST API. TanStack Query polling (5s interval) as dev fallback. |
| `MSG-F10` | **Admin can message** — Admin can send messages in any project thread (oversight) |
| `MSG-F11` | **Read receipts** — `readAt` timestamp per message per recipient (for new message notification in Module 16) |
| `MSG-F12` | **Message entrance pop-in animation & highlight pulse** — Newly received or sent bubbles render with `.animate-message-pop` (220ms spring entrance) and peer incoming bubbles trigger a 1.8s Analytical Sky Blue highlight pulse (`.animate-message-highlight`) |
| `MSG-F13` | **Sticky bottom scrolling & floating jump pill** — Multi-frame scroll anchoring via `ResizeObserver` locks viewport to the bottom on thread entry; a floating bottom pill (`unreadBelowCount`) appears when unread messages arrive while scrolled up |

### ❌ Explicitly Out of Scope

| Feature | Reason |
|---|---|
| Message editing or deletion by senders | Once sent (or blocked), the record is permanent for audit purposes |
| File/image attachments in messages | Files go through the formal project file upload system in Module 04/10 |
| Direct messaging between users outside a project | All messaging is project-scoped |
| Group video/voice chat | Out of MVP |
| Unblocking a blocked message | No pathway — block is final by design |



---

## 3. Database Schema

```prisma
model Message {
  id          String   @id @default(cuid())
  projectId   String
  senderId    String
  senderRole  RoleName
  content     String
  isBlocked   Boolean  @default(false)
  blockedReason String? // Which pattern triggered the block
  sentAt      DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id])
  sender  User    @relation(fields: [senderId], references: [id])
  readReceipts MessageReadReceipt[]
  blockedLog   BlockedMessageLog?

  @@index([projectId])
  @@index([senderId])
  @@index([sentAt])
  @@index([isBlocked])
  @@map("messages")
}

model MessageReadReceipt {
  messageId String
  userId    String
  readAt    DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@id([messageId, userId])
  @@map("message_read_receipts")
}

model BlockedMessageLog {
  id              String   @id @default(cuid())
  messageId       String   @unique
  detectedPattern String   // The regex pattern name that matched
  matchedText     String   // The specific text that triggered detection
  reviewedBy      String?  // Admin userId
  reviewedAt      DateTime?
  reviewNotes     String?
  createdAt       DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id])

  @@index([createdAt])
  @@index([reviewedBy])
  @@map("blocked_message_logs")
}
```

---

## 4. Communication Firewall Engine & Anti-Evasion Normalization

The communication firewall inspects all outgoing text streams using a **5-pass normalization pipeline** before evaluating prohibited regex patterns, preventing users from bypassing filters via typos, leetspeak, intentional character repetition, inter-character spacing, or spelled-out digits:

1. **Pass 1 (`RAW`)**: Inspects original text with case-insensitivity.
2. **Pass 2 (`LEETSPEAK`)**: Replaces common glyph substitutions (`@`/`4` $\rightarrow$ `a`, `0`/`*` $\rightarrow$ `o`, `3` $\rightarrow$ `e`, `1`/`!` $\rightarrow$ `i`, `$` $\rightarrow$ `s`, etc.).
3. **Pass 3 (`COLLAPSED`)**: Collapses repeating consecutive characters (`"faceboook"` $\rightarrow$ `"facebook"`, `"gggcaaash"` $\rightarrow$ `"gcash"`).
4. **Pass 4 (`STRIPPED_DELIMITERS`)**: Removes inter-character spacing, dashes, and periods to detect spaced keywords (`"f a c e b o o k"` $\rightarrow$ `"facebook"`, `"0 9 1 7..."` $\rightarrow$ `"0917..."`).
5. **Pass 5 (`WORD_DIGITS`)**: Converts spelled-out digit words (`"zero nine one seven..."` $\rightarrow$ `"0917..."`).

```ts
// src/lib/messaging/firewall.ts
export interface FirewallScanResult {
  blocked: boolean;
  patternName?: string;
  matchedText?: string;
  normalizedPass?: string;
}

export function runFirewall(rawContent: string): FirewallScanResult {
  const passes = generateNormalizationPasses(rawContent);
  for (const { label, text } of passes) {
    for (const { name, regex } of PROHIBITED_PATTERNS) {
      regex.lastIndex = 0;
      const match = regex.exec(text);
      if (match) {
        return {
          blocked: true,
          patternName: name,
          matchedText: match[0],
          normalizedPass: label,
        };
      }
    }
  }
  return { blocked: false };
}
```

### Zero-Leak Live Stream Policy
- **Zero-Persistence on Stream**: Blocked messages are stored in the database with `isBlocked = true` strictly for administrative audit (`BlockedMessageLog`).
- **Live Thread Isolation**: Query functions strictly filter out `isBlocked: true` messages, and the client UI displays a prominent amber violation alert banner without rendering the blocked message in the chat stream.

---

## 5. API Routes

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/messages` | CLIENT, STATISTICIAN, ADMIN | Send message (firewall runs before save) |
| `GET` | `/api/v1/messages/:projectId` | CLIENT, STATISTICIAN, ADMIN | Get thread (blocked messages hidden for non-Admin) |
| `GET` | `/api/v1/admin/blocked-messages` | ADMIN, CEO | All blocked messages across all projects |
| `PATCH` | `/api/v1/admin/blocked-messages/:id/review` | ADMIN, CEO | Mark blocked message as reviewed |
| `POST` | `/api/v1/messages/:projectId/read` | Any participant | Mark messages as read (for unread count) |

### Zod Schema

```ts
export const SendMessageSchema = z.object({
  projectId: z.string().cuid(),
  content:   z.string().min(1).max(5000),
});
```

---

## 6. Real-Time Architecture (Dual-Channel Supabase Realtime Phoenix Engine)

The consultation messaging system delivers sub-100ms real-time latency between the Lead Researcher (Client), Lead Statistician, and QA Lead through a high-speed, dual-channel broadcast pipeline:

```ts
// src/lib/messaging/realtime.ts
import { supabaseClient } from '@/lib/supabase';
import type { MessageDTO } from '@/features/messaging/schemas';

// Client-to-client instantaneous broadcast over established Phoenix WebSocket
export function subscribeToProjectMessages(
  projectId: string,
  onMessage: (message: MessageDTO) => void,
) {
  const channel = supabaseClient
    .channel(`project-messages:${projectId}`, {
      config: { broadcast: { ack: false, self: false } },
    })
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (payload?.id) onMessage(payload as MessageDTO);
    })
    .subscribe();

  return () => supabaseClient.removeChannel(channel);
}

export async function broadcastProjectMessage(projectId: string, message: MessageDTO) {
  const channel = supabaseClient.channel(`project-messages:${projectId}`);
  return (await channel.send({ type: 'broadcast', event: 'new_message', payload: message })) === 'ok';
}
```

### High-Speed Delivery Pipeline:
1. **0ms Optimistic Bubble**: Sender's input instantly mounts the bubble on screen with temporary identifier.
2. **Serverless Mutation**: Server Action `sendMessage()` saves the message to Postgres with firewall verification.
3. **Sub-10ms Client Peer Broadcast**: On mutation success, sender browser broadcasts `new_message` directly across its open WebSocket channel to connected peer browsers.
4. **Redundant REST Server Broadcast**: The server also dispatches an HTTP POST to `https://<ref>.supabase.co/realtime/v1/api/broadcast` as a redundant push.
5. **Immediate State Injection**: Receiving peer browser receives the broadcast frame, deduplicates by ID, dynamically computes `isMine`, and immediately appends to messages state without waiting for a database roundtrip.
6. **2-Second Adaptive Polling Safety Net**: Fallback polling catches any missed frames if WebSockets temporarily disconnect.
7. **Spring Pop-In & Analytical Highlight Pulse**: Newly mounted bubbles scale in via `.animate-message-pop` (220ms spring cubic-bezier). New incoming peer messages trigger `.animate-message-highlight`, pulsing a Sky Blue outline and substrate tint for 1.8s.
8. **Sticky Bottom-Most Scroll Anchoring**: Container `ResizeObserver` and multi-frame `requestAnimationFrame` scrolls lock the thread to the latest message on study open, eliminating race conditions with late-rendering fonts or badges.
9. **Floating Jump Indicator**: When scrolled up, incoming peer messages increment `unreadBelowCount`, displaying a floating pill with a down arrow that smoothly jumps to the bottom on click.

| Page | Route | Role | Description |
|---|---|---|---|
| Client Thread | `/dashboard/client/projects/:id/messages` | Client | Message thread + send input |
| Statistician Thread | `/dashboard/statistician/projects/:id/messages` | Statistician | Message thread + send input |
| Blocked Queue | `/dashboard/admin/messages` | Admin, CEO | Blocked message list with pattern, preview, review action |

---

## 7. Seed Data Requirements

```ts
const seedMessages = [
  {
    projectIntakeId: 'JAXIS-202608-0001',
    senderEmail:     'client@jaxis.dev',
    content:         'Hello! When can I expect the initial analysis to begin?',
    isBlocked:       false,
  },
  {
    projectIntakeId: 'JAXIS-202608-0001',
    senderEmail:     'stat@jaxis.dev',
    content:         'Hi! I have reviewed your research documents. I will begin the regression analysis this week.',
    isBlocked:       false,
  },
  // Seed one blocked message for Admin firewall demo
  {
    projectIntakeId: 'JAXIS-202608-0001',
    senderEmail:     'client@jaxis.dev',
    content:         'Can we chat on WhatsApp instead? My number is 09171234567.',
    isBlocked:       true,
    blockedReason:   'MESSENGER_APP',
  },
];
```

---

### 🎯 Expected Output (What you should be able to do now)

- [x] **Project-Scoped Messaging Thread:** Client, assigned Statistician, and Admin can view and post in the dedicated project communication thread.
- [x] **Communication Firewall Enforcement:** Server-side regex engine detects prohibited contact information (personal emails, PH phone numbers, GCash/Maya/PayPal, Telegram/Viber/FB/social handles, external URLs).
- [x] **Zero-Leak Message Blocking:** Prohibited messages are blocked entirely (`isBlocked = true`); sender receives an immediate policy violation notice; recipient receives nothing.
- [x] **Admin Firewall Review Queue:** Admin can audit all blocked communication attempts with sender, timestamp, detected pattern, and content in a dedicated review queue.
- [x] **Realtime Delivery & Micro-Delta Sync:** Instant messaging synchronization via Supabase Realtime WebSockets (`project-messages:{projectId}`) with adaptive fallback and Page Visibility API sleeping (`document.hidden`).
- [x] **Read Receipts & Participant Badges:** Messages clearly display sender role badges (`CLIENT`, `STATISTICIAN`, `QA`, `ADMIN`) and track recipient `readAt` timestamps.
- [x] **WhatsApp/Telegram Architecture & Reverse Pagination:** 15-message chunking on initial load, automatic scroll-up pagination with scroll position preservation, optimistic UI send, and zero parent window scrolling.
- [x] **Responsive Mobile Master-Detail UX:** Seamless full-width studies list with single-tap transition into full-height chat desk and one-tap `< Back` header button.
- [x] **Smooth Bubble Pop-In & Highlight Pulse:** Instant spring entrance animation on new messages and gentle cyan highlight on incoming peer notes.
- [x] **Sticky Bottom Scroll & Unread Jump Indicator:** Reliable bottom-most scroll anchoring on study load and floating jump button when reading earlier notes.


## 8. Acceptance Criteria (Done Checklist)

### Messaging
- [x] Client can send a message to project thread → Statistician and Admin see it
- [x] Statistician can send a message → Client and Admin see it
- [x] Admin can send a message in any project thread
- [x] Messages display sender role label (Client / Statistician / Admin)
- [x] Thread is empty state when no messages exist
- [x] New messages pop in with `.animate-message-pop` (220ms spring)
- [x] Incoming peer message highlights with `.animate-message-highlight` (1.8s cyan pulse)
- [x] Opening/loading a study locks scroll position to the bottom-most message
- [x] Receiving messages while scrolled up shows floating "New message" jump button
- [x] Clicking jump button smoothly scrolls thread to the bottom and dismisses pill

### Firewall
- [x] Message with email address → blocked; `is_blocked = true`; recipient sees nothing
- [x] Message with Philippine mobile number → blocked
- [x] Message with GCash/Maya reference → blocked
- [x] Message with WhatsApp/Telegram mention → blocked
- [x] Message with `@socialhandle` → blocked
- [x] Message with external URL (non-jaxis) → blocked
- [x] Sender who sent a blocked message sees: `"Your message was blocked. Sharing external contact information is not permitted."`
- [x] Normal messages (no prohibited content) are delivered successfully

### Admin Queue
- [x] All blocked messages appear in Admin blocked-message queue
- [x] Admin can see: project, sender, `detectedPattern`, `matchedText`, timestamp
- [x] Admin can mark a blocked message as reviewed → `reviewedAt` set
- [x] Client cannot access Admin blocked-message queue → 403

### Quality Gates
- [x] `npm run check-types` → 0 errors
- [x] `npm run lint` → 0 warnings/errors
- [x] `npm run build` → clean
