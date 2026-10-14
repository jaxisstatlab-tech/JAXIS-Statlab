# Database backup and restore

Supabase's free plan has no backups you can restore yourself, so JAXIS backs up its own database:

- **Every night at 2:00 AM (Philippine time)** GitHub copies the whole database, **checks the copy really restores**,
  encrypts it, and saves it in a private Cloudflare R2 bucket. Copies are kept for **30 days**.
- **Restoring** is a button in GitHub. A "test" restore never touches the live site; a "live" restore first saves a
  safety copy of the current data, then puts the backup back in one go (all or nothing).

Files: `.github/workflows/db-backup.yml` (nightly) and `.github/workflows/db-restore.yml` (restore). Both are free:
GitHub Actions costs nothing for public repos and R2 is free up to 10 GB.

What it covers: every table (studies, users, quotes, payments, messages...). It does **not** copy the uploaded files
in the main R2 bucket (theses, datasets, deliverables); those stay where they are.

---

## One-time setup (about 10 minutes)

### 1. Make a private bucket for the backups (Cloudflare)

1. Log in to **dash.cloudflare.com** → **R2 Object Storage** → **Create bucket**.
2. Name it `jaxis-db-backups`. Leave everything else as it is (it's private by default). **Create bucket**.
3. Don't turn on a public URL for it.

### 2. Make a key that can only use that bucket

1. R2 → **Manage API tokens** (top right of the R2 page) → **Create API token**.
2. Permissions: **Object Read & Write**. Bucket: **Apply to specific buckets only** → `jaxis-db-backups`.
3. **Create**. Copy and keep these three values from the next screen (it's shown only once):
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (also in the R2 overview page, right side)

### 3. Make a backup password

Make a long random password (20+ characters, e.g. from your password manager) and **save it somewhere safe outside
this PC** (password manager, or written down). The backups are encrypted with it. **If it's lost, the backups can't
be opened by anyone, including you.**

### 4. Add six secrets in GitHub

GitHub → the `JAXIS-Statlab` repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
Add each one (name exactly as written):

| Name | Value |
|---|---|
| `BACKUP_DATABASE_URL` | The `DIRECT_URL` value from `apps/app/.env` (the Supabase address ending in `:5432/postgres`) |
| `BACKUP_PASSPHRASE` | The backup password from step 3 |
| `R2_BACKUP_ACCOUNT_ID` | Account ID from step 2 |
| `R2_BACKUP_ACCESS_KEY_ID` | Access Key ID from step 2 |
| `R2_BACKUP_SECRET_ACCESS_KEY` | Secret Access Key from step 2 |
| `R2_BACKUP_BUCKET` | `jaxis-db-backups` |

Secrets stay hidden even though the repo is public (logs show `***`, and copies of the repo can't read them).

### 5. Run the first backup now

1. GitHub → **Actions** tab → **Database backup** (left list) → **Run workflow** → **Run workflow**.
2. Wait 2–3 minutes for the green ✓. In the log, "Prove the copy restores" should say something like
   "Restored 40 tables into a throwaway database".
3. In Cloudflare → R2 → `jaxis-db-backups` → `daily/`, you'll see a file like `jaxis-db-2026-10-14T1800Z.dump.gpg`.

From now on it runs by itself every night. If a night fails, GitHub emails you.

---

## Restoring

### Practice first (safe, do this once a month)

1. GitHub → **Actions** → **Restore database** → **Run workflow**.
2. backup: `latest` · target: **test** · confirm: leave empty → **Run workflow**.
3. Green ✓ = the backup opens and restores fine. Nothing live was changed.

### Real restore (when live data is broken or deleted)

1. Pick the backup to go back to: R2 → `jaxis-db-backups` → `daily/`. Choose the last file **from before** the
   problem happened and copy its name.
2. GitHub → **Actions** → **Restore database** → **Run workflow**:
   - backup: the file name (or `latest`)
   - target: **live**
   - confirm: type `RESTORE LIVE`
3. **Run workflow**. It first saves the current (broken) data to `pre-restore/` in the same bucket, so even a
   restore can be undone, then replaces the live tables with the backup in one step. If anything goes wrong midway,
   nothing changes.
4. Anything saved after that backup's time (new studies, payments, messages) is not in it. Check Payments to
   Check and the Studies list, and ask affected clients to resend if needed.

To undo a restore, run it again with the `pre-restore/...` file: copy it into `daily/` in R2 first (the restore
reads from `daily/`).

---

## Good to know

- **If GitHub stops the schedule:** GitHub pauses scheduled jobs in a repo that has had no commits for 60 days and
  emails you. Re-enable it from the Actions tab (or just push any commit).
- **Database password change:** if the Supabase database password changes, update `BACKUP_DATABASE_URL`.
- **New tables or columns:** nothing to do; each night copies whatever is there.
- **Bonus:** the nightly connection also keeps the free Supabase project from pausing for inactivity.
