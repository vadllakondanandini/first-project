# Campus Quest: The Freshman Survival and Navigation Maps

Campus Quest is a beginner-friendly campus guide for first-year students. It helps new students discover important places, search a campus directory, view saved point-to-point route notes, and report incorrect or missing information.

> **Important demo note:** The sample locations and route instructions in `database/schema.sql` are illustrative. Replace them with verified information for your own college before presenting this as a real campus map. This MVP uses route instructions, not live GPS navigation.

## 1. Problem and objectives

New students may not know where classrooms, labs, offices, the library, food areas, transport points or student services are located. Campus Quest keeps these details in one searchable place.

Objectives:
- Make campus places easy to search and filter.
- Show useful descriptions and location hints.
- Display saved directions between selected places when a route exists.
- Let students report outdated information.
- Let an authorized administrator maintain places, route notes and issue status.

## 2. Users and features

- **Student/visitor (no account required):** browse and search active places, filter categories, request saved route notes, submit an issue report.
- **Administrator (shared secret required):** create/update places, add or update routes, list reports and change report status through protected API endpoints.

The admin secret is a simple classroom MVP mechanism, not a full multi-user identity system. Use a long random secret and share it only with the project maintainer. A production college deployment should use individual admin accounts and stronger auditing.

## 3. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js 20+ and Express.js
- Supabase PostgreSQL through `@supabase/supabase-js`
- Helmet and express-rate-limit for basic HTTP hardening and rate limiting
- Git and GitHub

No frontend framework, paid service, external API, or remote image is required.

## 4. Folder structure

```text
campus-quest/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── supabase.js
│   ├── routes/
│   │   ├── places.js
│   │   ├── routes.js
│   │   ├── issues.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── admin.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

`package-lock.json` is generated automatically when you run `npm install`.

## 5. Prerequisites and installation links

Install:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS](https://nodejs.org/) (npm is included)
- [Git](https://git-scm.com/downloads)
- A free [Supabase](https://supabase.com/) account
- A [GitHub](https://github.com/) account for publishing source code

Check Node.js, npm and Git in a terminal:
```bash
node --version
npm --version
git --version
```
Use Node.js 20 or newer. If a command is not recognized, finish installing the tool and reopen the terminal.

## 6. Supabase setup

1. Sign in to Supabase and create a new project.
2. Choose a project name and a strong database password; save the password privately.
3. Wait until the project is ready.
4. Open **SQL Editor** in the Supabase dashboard.
5. Open this repository's `database/schema.sql`, copy all its contents into a new SQL query, and run it.
6. Open **Table Editor** and verify that `places`, `campus_routes`, and `issue_reports` exist.
7. Check the `places` table for the ten sample locations. Replace the sample names and directions with correct campus data.

The schema enables Row Level Security (RLS) on all tables and intentionally adds no anonymous table policies. The Express server uses the Supabase service-role key, which bypasses RLS. Therefore, **every privileged write route must enforce server-side authorization**. The included admin routes require the `x-admin-token` header. Never put the service-role key in browser code or GitHub.

## 7. Configure environment variables

Copy `backend/.env.example` to a new file named `backend/.env`. Obtain values from your Supabase project's **Project Settings → API** page.

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
ADMIN_TOKEN=replace_with_a_long_random_secret
```

- `PORT`: local Express port.
- `NODE_ENV`: `development` locally; use `production` when deployed.
- `SUPABASE_URL`: your project's URL.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged server-only key. Do not share or commit it.
- `ADMIN_TOKEN`: a private secret required for administrative API requests. Use at least 32 random bytes.

Generate a token with Node.js from PowerShell or a terminal:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```
Paste the output as the `ADMIN_TOKEN` value. Never paste a real key into a public issue, screenshot, or frontend file. `.env` is private local configuration; `.env.example` is a safe template with placeholders.

## 8. Install and run

Open the project root (`campus-quest`) in VS Code. Open **Terminal → New Terminal**, then run:

```bash
cd backend
npm install
npm run check
npm start
```

Expected startup message:
```text
Campus Quest is running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Keep the terminal open while using the application. For development with automatic Node restart, use `npm run dev`.

Health check: visit [http://localhost:3000/api/health](http://localhost:3000/api/health). Expected response:
```json
{"status":"ok","service":"Campus Quest API"}
```

The health endpoint checks that Express is running; it does not prove Supabase credentials are valid. The place directory will load only after the database schema and environment values are correct.

## 9. Architecture

1. The browser loads HTML, CSS and vanilla JavaScript from `frontend/`.
2. Browser JavaScript calls `/api/...` using `fetch()`.
3. Express validates requests, checks admin authorization for protected routes, and calls Supabase.
4. Supabase PostgreSQL stores places, route instructions and issue reports.
5. Express returns JSON; the browser renders the response with HTML escaping for user-controlled text.

The browser never connects to PostgreSQL directly and never receives the Supabase service-role key.

## 10. REST API

All responses are JSON. Unless noted, public endpoints do not require login.

| Method | Path | Purpose / input | Permission / common responses |
|---|---|---|---|
| GET | `/api/health` | API status | Public; `200` |
| GET | `/api/places` | List active places; optional `?category=library` or `?search=lab` | Public; `200`, `400` invalid category, `500` server/database issue |
| GET | `/api/places/:id` | Get one active place | Public; `200`, `404`, `500` |
| GET | `/api/routes?from=UUID&to=UUID` | Get saved route instructions between two place IDs | Public; `200`, `400` missing/same IDs, `404` no saved route, `500` |
| POST | `/api/issues` | `{ "reporter_name": "Optional", "issue_type": "wrong_information", "details": "At least ten characters" }` | Public; `201`, `400` invalid input, `429` rate limit, `500` |
| POST | `/api/places` | Create place with `name`, `category`, `description`; optional location fields | Admin `x-admin-token`; `201`, `400`, `401`, `409`, `500` |
| PATCH | `/api/places/:id` | Update supported place fields | Admin; `200`, `400`, `401`, `404`, `500` |
| POST | `/api/routes` | `{ "from_place_id":"UUID", "to_place_id":"UUID", "instructions":"At least ten characters", "estimated_minutes":4 }` | Admin; upserts a route pair; `201`, `400`, `401`, `500` |
| GET | `/api/issues` | List latest 100 reports | Admin; `200`, `401`, `500` |
| PATCH | `/api/issues/:id` | `{ "status":"reviewing" }` (also `new`, `resolved`, `dismissed`) | Admin; `200`, `400`, `401`, `404`, `500` |
| GET | `/api/admin/verify` | Check admin token | Admin; `200`, `401` |

Admin requests require this HTTP header: `x-admin-token: YOUR_ADMIN_TOKEN`. Keep it secret. Do not put it in a public URL or commit it.

### Example admin requests

Run from a terminal with your own token and actual IDs. Replace every placeholder.

```bash
curl -H "x-admin-token: YOUR_ADMIN_TOKEN" http://localhost:3000/api/admin/verify
curl http://localhost:3000/api/places
```

Create a place:
```bash
curl -X POST http://localhost:3000/api/places ^
  -H "Content-Type: application/json" ^
  -H "x-admin-token: YOUR_ADMIN_TOKEN" ^
  -d "{\"name\":\"Science Block\",\"category\":\"academic\",\"description\":\"Classrooms and science department offices.\",\"building\":\"Science Block\"}"
```
The `^` line continuation is for Windows Command Prompt. In PowerShell, use a single line or PowerShell backticks.

## 11. Manual testing checklist

- [ ] Open `/api/health`; expect JSON with `"status":"ok"`.
- [ ] Load the home page with valid Supabase credentials; expect the seeded places.
- [ ] Search for `library`; only matching places should remain.
- [ ] Filter by `food`; only food-category locations should show.
- [ ] Select Main Academic Block → Central Library; expect route instructions.
- [ ] Select the same place twice; the form should ask for a different destination.
- [ ] Choose a pair with no route; expect a friendly “no saved route” message.
- [ ] Submit an issue with fewer than 10 characters; expect a validation message and no database record.
- [ ] Submit a valid issue; expect a success confirmation and a new database row.
- [ ] Call `POST /api/places` without the admin header; expect `401`.
- [ ] Call it with the correct admin header and valid input; expect `201`.
- [ ] Try an invalid category or too-short description; expect `400`.
- [ ] Test on a narrow/mobile browser; cards and forms should stack vertically.
- [ ] Stop the server and refresh; the browser should show a helpful loading/API error rather than a blank page.

These are suggested tests; they have not been run against your personal Supabase project.

## 12. Troubleshooting

- **Place list fails:** check that Supabase project setup and `schema.sql` completed, then confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
- **“Invalid API key” or database error:** use the correct key from the same Supabase project. Restart Node after editing `.env`.
- **`npm` or `node` not recognized:** install Node.js LTS, close and reopen VS Code, then run the version commands.
- **Port already in use:** change `PORT=3001` in `.env` and open `http://localhost:3001`.
- **Admin API returns 401:** confirm the request header is exactly `x-admin-token` and matches `ADMIN_TOKEN`; restart the server after changing it.
- **No route found:** the MVP only returns routes explicitly stored in `campus_routes`; add the correct route using the protected endpoint.
- **SQL relation does not exist:** rerun `database/schema.sql` in the correct Supabase project's SQL Editor.
- **CORS or file-opening problems:** do not open `index.html` directly; visit the Express URL so relative `/api` calls work.

## 13. Git and GitHub

Before pushing, confirm real secrets are only in `backend/.env` and the root `.gitignore` excludes that file and `node_modules/`.

From the project root:
```bash
git init
git status
git add .
git status
git commit -m "Build Campus Quest"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Create an empty repository on GitHub first, then replace `YOUR_GITHUB_REPOSITORY_URL` with its actual HTTPS or SSH URL. If Git asks you to identify yourself, configure your name and email:
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
Review the second `git status` before committing. `backend/.env.example` should be tracked; `backend/.env` should not. If a secret was ever committed, `.gitignore` alone is not enough: rotate/revoke the exposed key immediately and clean the repository history before sharing it.

## 14. Security notes and limitations

- The Supabase service-role key is privileged and belongs only on the server.
- RLS is enabled, but the server's service-role client bypasses RLS. Protect every privileged route with server-side checks.
- The shared admin token is suitable only for a controlled student demo. It is not a replacement for individual accounts, audit logs or managed roles.
- Public issue submission is rate-limited at the API level; do not collect sensitive personal information in report details.
- The MVP provides saved route text, not an interactive geographic map, GPS positioning, live room availability or shortest-path calculations.
- Sample campus data and routes must be verified before real use.
- Future improvements: campus-specific map coordinates, accessible route graphs, individual administrator accounts, photo uploads, report notifications and multilingual labels.

## 15. Final checklist

- [ ] Install dependencies in `backend/`.
- [ ] Run `database/schema.sql` in the correct Supabase project.
- [ ] Configure `backend/.env` locally without committing it.
- [ ] Run `npm run check` and `npm start`.
- [ ] Open `http://localhost:3000`.
- [ ] Verify search, filters, routes and issue reporting.
- [ ] Replace demo information with verified campus data.
- [ ] Review Git status for secrets before pushing to GitHub.
