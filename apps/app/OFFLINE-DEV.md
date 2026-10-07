# Offline Dev Mode (Sample Data)

Run the app with sample data and **no real database**. Use this to design and test pages safely.

## Start it

Open a terminal in the `apps/app` folder (not `apps`):

```
cd "C:\Users\ROG STRIX\Desktop\JAXIS StatLab\apps\app"
npm run dev:offline
```

Then open **http://localhost:3011**.

## Log in

| Role | Email | Password |
| --- | --- | --- |
| Client (Ana Cruz) | client@jaxis.dev | JaxisClient2026! |
| Statistician (Dr. Juan Reyes) | stat@jaxis.dev | JaxisStat2026! |
| QA Lead (Maria) | qa@jaxis.dev | JaxisQA2026! |
| Admin | admin@jaxis.dev | JaxisAdmin2026! |
| CEO | ceo@jaxis.dev | JaxisCeo2026! |
| Finance | finance@jaxis.dev | JaxisFin2026! |

Faster: the login page shows an **Offline mode: sign in as** dropdown. Pick an account to fill in the email and password, then press Log in. It only appears in offline mode and isn't included in production builds. If you don't see it, restart `npm run dev:offline`.

Tip: to test chat between two people, log in as the client in a normal window and as the statistician in a private window.

## Reset the sample data

If the sample data looks wrong, or you want a fresh start:

```
npm run seed:local-dev
```

This rebuilds 8 sample studies for Ana Cruz: quotes, agreements, payments, notifications, DefenseLab sessions, chat messages, the statistician's analysis files, QA reviews, delivered files, a past change request and a past claim. Anything you added yourself is kept.

## Which port is which

| Port | Command | Data |
| --- | --- | --- |
| 3001 | `npm run dev` | **Real database (production).** No sample data. |
| 3011 | `npm run dev:offline` | Sample data from local files. Safe to click anything. |
| 3013 | `npm run dev:localdb` | A real database on this computer with test accounts. Safe to click anything. |

All three can run at the same time.

## Local database mode (real database, on your computer)

Offline mode skips the database, so it can't show everything (saving, who can see what, payment rules). For that, use a real database that runs on your own computer:

```
npm run dev:localdb
```

Then open **http://localhost:3013**. The first run takes about a minute (it creates the database and adds test data).

| Role | Email |
| --- | --- |
| Client (has 6 studies at different stages) | clienta@local.test |
| Second client (to check clients can't see each other) | clientb@local.test |
| Admin | admin@local.test |
| CEO | ceo@local.test |
| Finance | finance@local.test |
| Statistician | stat@local.test |
| QA Lead | qa@local.test |

Every account's password is `LocalTest123!`.

- **Stop it:** press Ctrl+C in the terminal. Your data is kept for next time.
- **Start fresh:** `npm run dev:localdb -- --reset` deletes the local data and adds the test data again.
- It never touches the live database: the address is fixed to this computer (port 54329), and the data lives in `apps/app/.local-db` (ignored by git).
- Email, file storage and live chat updates are switched off, so uploading new files doesn't work here.
- After a change to `prisma/schema.prisma`, just restart it; new tables and columns are added automatically.

## Good to know

- Sample data lives in local files that git ignores (`.dev-projects.json`, `.dev-quotations.json`, `.dev-sows.json`, `dev_data/payments.json`, `.dev-alerts.json`, `.dev-defenselab.json`, `.dev-messages.json`, `.dev-analysis.json`, `.dev-deliverables.json`, `.dev-disputes.json`, `.dev-revisions.json`). They are never committed and never touch the real database or file storage.
- Offline mode builds into its own `.next-offline` folder, so it doesn't clash with `npm run dev`.
- Live chat updates (instant push, "is typing") don't work offline. New messages still arrive within about 3 seconds.
- Files you upload offline (for example a payment QR in Finance → Payment accounts) are kept in the git-ignored `.dev-uploads/` folder and open through the normal file viewer, with the same permission checks. Files in the sample data were never uploaded, so they show in lists but don't open. Delete `.dev-uploads/` to clear them.
- Saving settings offline writes to the shipped sample files (`dev_data/payment_channels.json`, `dev_data/payroll_configs.json`, `dev_data/package_rates.json`, `.dev-catalog.json`), and deleting a sample account writes to `.dev-users.json`. Don't commit those changes; undo them with `git checkout -- <file>` when you're done testing.
- A sample account deleted from the CEO pages stays deleted (sign-in no longer falls back to the built-in list). Undo it by restoring `.dev-users.json` as above.
- Good studies to open: **Study habits, sleep, and GWA…** (in analysis: workbench, review, chat) and **Financial literacy and saving habits…** (delivered: files, change requests).
- The analyst (stat@jaxis.dev) and reviewer (qa@jaxis.dev) also get six studies from a second sample client, Carlo Mendoza (not a login), one in each state: not started and due within a day, late with a pause asked, deadline paused, changes asked by the reviewer, waiting for the reviewer, and client asked for changes. If My Studies or the QA Review Desk looks empty, run `npm run seed:local-dev` again.
- **"Missing script: dev:offline"**: you're in the wrong folder. Run `cd app` from `apps`, then try again.
- **Page shows old data or a 404 after big changes**: stop the server, delete the `.next-offline` folder, and start again.
