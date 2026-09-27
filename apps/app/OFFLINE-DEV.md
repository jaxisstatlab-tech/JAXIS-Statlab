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

Both can run at the same time.

## Good to know

- Sample data lives in local files that git ignores (`.dev-projects.json`, `.dev-quotations.json`, `.dev-sows.json`, `dev_data/payments.json`, `.dev-alerts.json`, `.dev-defenselab.json`, `.dev-messages.json`, `.dev-analysis.json`, `.dev-deliverables.json`, `.dev-disputes.json`, `.dev-revisions.json`). They are never committed and never touch the real database or file storage.
- Offline mode builds into its own `.next-offline` folder, so it doesn't clash with `npm run dev`.
- Live chat updates (instant push, "is typing") don't work offline. New messages still arrive within about 3 seconds.
- Uploading or downloading files doesn't work offline (there's no storage). The file lists still show.
- Good studies to open: **Study habits, sleep, and GWA…** (in analysis: workbench, review, chat) and **Financial literacy and saving habits…** (delivered: files, change requests).
- **"Missing script: dev:offline"**: you're in the wrong folder. Run `cd app` from `apps`, then try again.
- **Page shows old data or a 404 after big changes**: stop the server, delete the `.next-offline` folder, and start again.
