# NMD Development Desk

Development dashboard of the NMD team (PMI Global): live projects, QVE, special DBs, daily tasks, transfers, follow-ups and value reports.

| File / folder | What it is |
|---|---|
| `index.html` | The dashboard for GitHub Pages (uses Google Firebase for the shared data) |
| `firebase-config.js` | Your Firebase keys and who may sign in — **fill this in once** |
| `js/claude-firebase-shim.js` | Connects the dashboard to Firebase (no need to edit) |
| `firestore.rules` | Database security rules — paste into Firebase |
| `tools/backup.html` | Load a data backup into Firebase / download a backup |
| `claude-version/NMD_dashboard_claude.html` | The same dashboard as it runs on claude.ai (code backup) |

> **Never upload `nmd_data_backup_*.json` to GitHub.** It holds customer and project data. `.gitignore` already blocks it.

---

## Part A — Put the code on GitHub (backup)

1. Go to **github.com** → **Sign up** (or sign in). Use the company e-mail.
2. Top-right **+** → **New repository**.
   - Name: `nmd-development-desk`
   - Visibility: **Private** if you only want a backup. (For a free GitHub Pages website the repository must be **Public** — see Part C. The code has no data or passwords in it, so public is safe.)
   - Do **not** tick "Add a README".
   - Click **Create repository**.
3. On the new empty repository page click **uploading an existing file**.
4. Unzip `nmd-development-desk.zip` on your computer. Open the folder, select **everything inside it** (including the `js`, `tools`, `claude-version` folders and the `.gitignore` / `.nojekyll` files) and drag it into the browser.
   - Windows hides files starting with a dot: in File Explorer → **View → Show → Hidden items**.
5. Commit message: `First version of NMD Development Desk` → **Commit changes**.

The code is now backed up with full history. Each time the dashboard is changed, upload the new `index.html` (and `claude-version/…`) the same way — GitHub keeps every old version (**History** button on each file).

---

## Part B — Create the Firebase database (free)

> **Which account?** Firebase needs a *Google* account to create the project. It does **not** have to be the same account as GitHub, and it does not have to be a company account — use **reportspmi411@gmail.com** (or any Gmail the company controls). Avoid a personal Gmail, so the project stays with the company if someone leaves. The team itself signs in with their **Outlook company e-mails** (step 4) — they don't need Gmail.

1. Go to **console.firebase.google.com**, sign in with that Google account → **Create a project** → name `nmd-development-desk` → Google Analytics **off** → **Create project**.
2. Left menu **Build → Firestore Database** → **Create database**
   - Location: **asia-south1 (Mumbai)** → **Next**
   - **Start in production mode** → **Create**.
3. In Firestore open the **Rules** tab → delete everything → paste the whole content of `firestore.rules` → **Publish**.
   - The rules allow only `@pmiglobal.co.in` Google accounts and `reportspmi411@gmail.com`. To add another person with a different e-mail, add it in **both** `firestore.rules` and `firebase-config.js`.
4. Left menu **Build → Authentication** → **Get started** → **Sign-in method**:
   - Click **Email/Password** → turn on **Email/Password** *and* **Email link (passwordless sign-in)** → **Save**. This lets everyone sign in with their Outlook company e-mail: they type it in, get a link in their inbox, click it, and stay signed in on that device.
   - (Optional) **Add new provider → Google** → **Enable** → **Save**, for anyone who prefers a Google account.
5. ⚙ **Project settings** → **General** → scroll to **Your apps** → click the **`</>`** (Web) icon → nickname `nmd-desk` → **Register app**. Firebase shows a block like `const firebaseConfig = { apiKey: "...", ... }`.
   Copy the six values into `firebase-config.js` (replace every `PASTE_…`), then upload the edited `firebase-config.js` to GitHub (**Add file → Upload files**, it replaces the old one).

---

## Part C — Turn on the website (GitHub Pages)

1. In the GitHub repository → **Settings** → **Pages**.
2. **Source: Deploy from a branch** → Branch **main**, folder **/ (root)** → **Save**.
   - On a free GitHub account this option needs a **Public** repository (Settings → General → Danger Zone → Change visibility). Data stays protected by Google sign-in + Firebase rules.
3. Wait 1–2 minutes. The address appears at the top, e.g. `https://YOUR-NAME.github.io/nmd-development-desk/`.
4. Back in Firebase → **Authentication → Settings → Authorized domains** → **Add domain** → `YOUR-NAME.github.io` → **Add**. (Without this the Google sign-in popup refuses.)

---

## Part D — Move the data in (one time)

1. Open `https://YOUR-NAME.github.io/nmd-development-desk/tools/backup.html`.
2. Type your company e-mail → **E-mail me the sign-in link** → open Outlook → click the link (on the same computer and browser).
3. Section 1 → choose the file **`nmd_data_backup_2026-10-23.json`** → **Load into Firebase**. Wait for "Finished: … written, 0 failed".
4. Open `https://YOUR-NAME.github.io/nmd-development-desk/` → sign in the same way → pick your name → enter your **same PIN** as before.

Projects, tasks, special DBs, customers, team, PINs and plans are all carried over.

---

## Part E — Switch-over day (important)

The claude.ai dashboard and the GitHub dashboard have **separate databases**. They do not sync.

1. Pick a day (e.g. Monday morning). Tell the team to stop using the claude.ai link the evening before.
2. Ask Claude for a **fresh data backup** that morning, and load it with Part D, step 3.
3. Share only the GitHub link with the team from then on.
4. The weekly Thursday e-mail report currently reads the claude.ai data. Ask Claude to switch it to the Firebase data after the move.

---

## Part F — Daily care

- **Weekly backup:** open `tools/backup.html` → **Download backup**. Keep the file on the company drive (not GitHub).
- **Changing the dashboard:** edit with Claude, then upload the new `index.html` to GitHub → **Commit changes**. The site updates in about a minute (press Ctrl + F5 to see it).
- **Free limits (Firebase Spark plan):** 50,000 reads and 20,000 writes per day — far more than the team needs (about 250 reads each time someone opens the dashboard).
- **Someone cannot sign in:** check their e-mail is in `firestore.rules` and `firebase-config.js`, and that the GitHub address is in Firebase *Authorized domains*.
- **Sign-in link not arriving:** it comes from `noreply@<project>.firebaseapp.com` — check Outlook *Junk*. If the company mail filter blocks it, ask IT to allow that sender, or use **sign in with Google** instead. The link must be opened on the same device and browser where it was requested.
- **Forgot PIN:** Firebase → Firestore Database → `config` → `pins` → delete that person's field (kiran, atharva, prathamesh, head or owner). Next time they open the dashboard they set a new PIN.
