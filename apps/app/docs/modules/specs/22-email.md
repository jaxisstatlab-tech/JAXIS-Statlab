# JAXIS — Module 22: Email (only what matters)

**Module Code:** `22-email`\
**Domain:** Notifications by email\
**Depends On:** `16-notifications` (the in-app bell), `21-production-hardening`\
**Status:** Done 2026-10-02 (not yet deployed)

---

## 1. Why

Email goes through **Resend's free plan: 100 emails a day, 3,000 a month**. So email is kept for moments when someone has to **do** something. Everything else stays in the in-app bell, which every alert still uses.

Before this change, the app sent only two kinds of email:
- password reset;
- new study request, sent to every admin account, including a suspended demo one.

Nothing else was ever emailed. For example, when a client accepted a price with **Rush (3 days)**, the team only got a bell alert that didn't mention Rush.

## 2. What gets emailed

About **6 emails per study** across its whole life.

### Team inbox

Staff emails go to one shared inbox: `TEAM_INBOX_EMAIL`, defaulting to `jaxis.statlab@gmail.com`, the same inbox as the website contact form. That's 1 email per alert instead of 1 per admin.

| Email | When | Where in the code |
|---|---|---|
| New study request | A client sends a study | `createProject` (`src/features/projects/actions.ts`) |
| Price accepted | A client accepts a price. The subject says **RUSH / EXPRESS / EMERGENCY** when picked, and the email shows the speed and the date the client needs it | `respondQuotation` (`src/features/quotations/actions.ts`) |
| Claim filed | A client files a claim (rare) | `submitDisputeAction` (`src/features/disputes/actions.ts`) |

### Client

| Email | When | Where in the code |
|---|---|---|
| Your price is ready | Admin sends the price | `issueQuotation` |
| We need a bit more information | Admin asks for missing info (the study is paused) | `requestMissingInfo` |
| Your agreement is ready to sign | The first agreement is made | `generateSOW` (`src/features/sow/actions.ts`) |
| We couldn't accept your receipt | Finance rejects a receipt | `rejectPayment` (`src/features/payments/actions.ts`) |
| Your files are ready | QA approves (study delivered) or admin releases the files | `submitQaReview` (`src/features/qa/actions.ts`), `releaseDeliverables` (`src/features/deliverables/actions.ts`) |

### Always

**Password reset.** It's sent even when the budget is used up, so nobody is locked out.

### In-app only, on purpose

Chat messages (the biggest volume), receipt uploaded, payment confirmed, analyst assigned, agreement signed, change requests, and status updates.

## 3. Budget

| New studies a day | Emails a day | Emails a month | Free plan |
|---|---|---|---|
| 5 | ~30 | ~900 | Fine |
| 10 | ~60 | ~1,800 | Fine |
| 12+ | ~72+ | ~2,200+ | Close; consider Resend's paid plan (about $20/month for 50,000) |

Fewer in practice: a client who doesn't accept the price gets only 1–2 emails.

## 4. Rules (`src/lib/email/policy.ts`, `src/lib/email/index.ts`)

- **Allow-list.** Only the emails above can go out. Anything else asked of `sendEmail` is skipped, so new code can't quietly burn the budget.
- **Limits.** Once 90 emails have been sent in the last 24 hours, or 2,850 in the last 30 days, every email except password reset is **held back**. It's recorded in the email log as FAILED with "Held back: email budget used…" and can be resent from **Email Delivery Logs** (Admin, Retry). The in-app alert still goes out.
- **Once per study.** New study request, price accepted, agreement ready and files ready are sent only once per study and address. For example, QA approval and a later admin release don't both email "files ready".
- **Never slows the page.** Emails are sent after the response (Next.js `after`). A failed email never undoes or fails the action.
- **Development doesn't email people.** Outside production, emails are only written to the server log and the email log, unless `EMAIL_SEND_IN_DEV=1`.
- **Retries.** Up to 3 attempts per email. The admin Retry button now rebuilds the email from the study, with its title, ID and client.
- **Plain, safe emails.** One simple design in plain English (`src/lib/email/renderer.ts`). Names, titles and notes are escaped before going into the email. Buttons link straight to the right page, for example the study's price, agreement, payment or files page.

## 5. Settings

| Setting | Where | Meaning |
|---|---|---|
| `RESEND_API_KEY` | Vercel (app project) | Resend key. A send-only key is enough. Without it, nothing is sent. |
| `RESEND_FROM_EMAIL` | Vercel | Sender, e.g. `JAXIS StatLab <notifications@jaxis-statlab.com>`. The domain must be verified in Resend. |
| `TEAM_INBOX_EMAIL` | Vercel (optional) | Team inbox. Defaults to `jaxis.statlab@gmail.com`. |
| `EMAIL_SEND_IN_DEV` | Local only (optional) | `1` to really send while developing. Leave it unset normally. |

## 6. How to check it's working

- **Email Delivery Logs** (admin menu) lists every email: SENT, FAILED or held back.
- **resend.com → Emails** shows what Resend actually delivered. If the app logs SENT but Resend shows nothing, the app's Vercel project is missing `RESEND_API_KEY`: without a key the app only logs.
- The website contact form (`apps/web/app/api/contact/route.ts`) also uses Resend from the same sender and is **not counted** in the app's budget. It's low volume.

## 7. Verification (2026-10-02)

| Check | How | Result |
|---|---|---|
| Rules | Script against the local test database (`npm run dev:localdb`) | Chat messages never emailed; "files ready" sent once, second skipped; development only logs; at 90 in 24 hours normal emails held back and logged for retry; password reset still sent |
| Safe content | Rendered a claim email with `<script>` in the title | Escaped |
| End to end | Signed in as the local test client, picked Rush on the price page, accepted | Team email `RUSH (3 DAYS): price accepted for …` to the team inbox |
| Look | Rendered all 8 emails to HTML and checked two in a browser | Plain, readable, correct buttons |
| Code | `tsc`, lint on every changed file | Clean |

## 8. Open

- Confirm the **app's** Vercel project has `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (the website project does; its contact form emails arrive).
- `src/features/quotations/notifications.ts` holds old "[EMAIL_DISPATCH]" stubs that only write to the server log (including the client's email address). Remove them in a clean-up pass.
- `.env.local` has an invalid Resend key. It's harmless now (development doesn't send), but delete it.
