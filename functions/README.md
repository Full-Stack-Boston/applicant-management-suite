# AMS Backend & Cloud Functions

This directory contains the server-side logic for the Application Management Suite (AMS). It uses Firebase Cloud Functions to handle authentication, database triggers, email/SMS notifications, and video interview scheduling.

## 📂 Directory Structure

* **`src/modules/`**: Core application logic.
    * `auth.js`, `interviews.js`, `dailyCo.js`, `zoho.js`, etc.
* **`src/scripts/`**: ETL tools for data migration and seeding.
* **`src/config.js`**: Shared constants (Collection names, Templates, API keys).
* **`src/utils.js`**: Shared helpers (Date formatting, Search token generation).

## 🚀 Setup & Configuration

This project uses **Environment Variables** for configuration.

### Email delivery modes

AMS has two outbound paths and a Settings toggle (`emailDeliveryMode` on `siteConfiguration`):

| Mode | Contact Center / system notices / automations | Mailbox (Zoho UI) | Public contact form |
|------|-----------------------------------------------|-------------------|---------------------|
| **`demo` (default)** | Writes `emails` docs with `delivery.state: SUCCESS` + `simulated: true` (Trigger Email skips them) | `mail_cache` only (seed + mock compose); Zoho API not called | **Always real** → `OWNER_LEAD_EMAIL` |
| **`connected`** | Normal queue → Firebase **Trigger Email** extension | Live Zoho when `ZOHO_*` env is set; clear error if missing | Same owner lead path |

**Ops checklist for Connected:**

1. Install/configure the Firebase **Trigger Email** extension on this project (SMTP or SendGrid in the extension console — not in this repo).
2. Set Zoho secrets below if you want a live admin mailbox.
3. In Site Settings → **Email Delivery**, switch to **Connected** and Save.
4. Set **Lead Capture → Owner Lead Email** to the private address that should receive website inquiries (never shared FSB department inboxes for demo traffic).

Leave mode on **Demo** for public portfolio demos so Contact Center / mailbox never touch live FSB mailboxes.

### Demo application window rotation

Scheduled function `rotateDemoApplicationWindow` runs daily (05:15 America/New_York) and, **only in demo email mode**, keeps `APPLICATION_DEADLINE`, `NEXT_APPLICATION_OPEN_DATE`, and `CYCLE_YEAR` on a ~1-month open / 5-day closed cycle. It does **not** rewrite application documents (lists/ops use `cycleYear`). Set `DEMO_WINDOW_ROTATION_ENABLED: false` on site config to pause.

### 1. Environment Variables (.env)
Create a `.env` file in this directory (do not commit it to git) with the following keys:

```env
# Daily.co (Video) — optional; use your own Daily.co subscription (not shared FSB accounts)
DAILY_KEY=your_daily_api_key_here
DAILY_DOMAIN=https://your-org.daily.co

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Zoho Mail (Email Sync) — required only when emailDeliveryMode is "connected"
ZOHO_CLIENTID=your_zoho_client_id
ZOHO_CLIENTSECRET=your_zoho_client_secret
ZOHO_REFRESHTOKEN=your_refresh_token
ZOHO_ACCOUNTID=your_zoho_account_id
ZOHO_WEBHOOK_SECRET=your_custom_secret_string
```

Outbound transactional mail (Contact Center when Connected, plus always-on public contact leads) is delivered by the **Trigger Email** Firebase extension listening on the `emails` collection. Configure that extension in the Firebase console; there are no `SENDGRID_*` / `SMTP_*` keys in this Functions package.
### 2. Installation
```Bash
npm install
```

### 3. Deployment
To deploy all functions to Firebase:

```Bash
npm run deploy
```

## 🛠️ ETL & Data Tools
#### Located in **`src/scripts/`**. Run these locally using node:  

#### Generates a mock database with 50+ linked records (Applicants, Profiles, Applications).
```Bash
node src/scripts/seedData.js
```
#### `Stage 1:` Cleans raw JSON export data (types and defaults).
```
node src/scripts/transform.js
```
#### `Stage 2:` Standardizes fields (names, grades) for consistency.
```
node src/scripts/normalize.js
```
#### `Stage 3:` Merges normalized data with supplementary datasets.
```
node src/scripts/combine.js
```
#### `Stage 4:` Uploads the final processed dataset to Firestore.
```
node src/scripts/migrate.js
```
#### Utility to copy collections between Firebase projects (e.g., Prod -> Dev).
```
node src/scripts/bridgeMigrate.js
```

## 🔑 Credentials
These files are required for local scripts but are ignored by Git for security:

* **`serviceAccountKey.json:`** Admin SDK key for the active project.

* **`sourceServiceAccount.json` & `destServiceAccount.json:`** Required only for cross-project migrations.

## Daily.co (optional)

Video interviews are optional. Adopters must supply their own Daily.co subscription and API credentials (or replace Daily with another provider). There is no shared Full Stack Boston Daily account or Mission Control coupling in this template.

- `DAILY_KEY` — your Daily.co API key (from your Daily dashboard)
- `DAILY_DOMAIN` — your Daily subdomain URL, e.g. `https://your-org.daily.co` (required for room URL fallbacks; defaults to `https://your-org.daily.co` if unset)

### Video budget (optional spending cap)

Site Settings → **Video / Daily** stores `videoBudget.mode` as `off` | `10` | `50` | `100` of a 10,000 participant-minute monthly base. This caps usage on **your** Daily account only — it is not connected to Full Stack Boston Mission Control or any FSB-operated Daily team. Cloud Functions hard-gate room create/join when the cap is exceeded. Usage is sampled every 5 minutes into `videoUsage/{YYYY-MM}`; `videoBudget/status` holds a live snapshot for the Settings UI. Owner alerts email `OWNER_LEAD_EMAIL` (not demo-simulated).
