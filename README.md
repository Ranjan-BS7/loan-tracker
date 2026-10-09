# Loan Tracker

A full-stack app to keep track of money you've lent to people — who borrowed it, when,
interest terms, repayment history, and any collateral/property you agreed on as a
fallback if they can't pay you back.

**Stack:** Node.js + Express + SQLite (backend) · React + Vite (frontend) · JWT login.

---

## What it tracks (per record)

**Borrower info** — name, phone, email, address, ID/reference note.

**Loan terms** — amount borrowed, interest (none / simple / compound, % per year),
date borrowed, expected return date, status (pending / partially paid / fully paid /
overdue / defaulted).

**Collateral / fallback security** — description of any property or asset agreed as
a fallback (e.g. gold, vehicle papers, land documents) and its estimated value, for
cases where the money isn't returned.

**Repayment history** — every partial payment logged with date and note. The app
automatically calculates interest accrued to date and the outstanding balance.

**Notes** — free text for anything else worth remembering.

All of this is editable at any time from the frontend, and everything is stored in a
local SQLite database file on the backend.

Since this holds financial data, the app requires login. Anyone can create their own
account (username + password) from the login screen, and **each account's loan records
are private** — one person's login never sees another's data. This makes it safe for
multiple people (e.g. family members) to use the same running instance of the app.

---

## Project structure

```
loan-tracker/
├── backend/          Express API + SQLite database
│   ├── server.js
│   ├── db.js          (schema lives here)
│   ├── routes/
│   │   ├── auth.js
│   │   └── loans.js
│   └── middleware/auth.js
└── frontend/          React app (Vite)
    └── src/
        ├── pages/      Login, Dashboard, LoanForm, LoanDetail
        ├── api.js
        └── styles.css
```

---

## Running it locally

Requires [Node.js](https://nodejs.org) 18+ installed.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then optionally edit JWT_SECRET in .env
npm start
```

This starts the API on **http://localhost:4000** and creates `loan-tracker.db`
(a SQLite file) in the `backend` folder the first time it runs. That one file is
your entire database — back it up however you like (copy it, put it in a synced
folder, etc.).

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The dev server proxies API calls to the backend
automatically (see `vite.config.js`), so both need to be running at once.

On first open you'll land on a login screen — use "Don't have an account? Sign up"
to create your own username and password. Anyone else using this app (e.g. family
members) can sign up for their own account too; everyone's loan records stay private
to their own login.

### 3. Building for production (optional)

```bash
cd frontend
npm run build
```

This outputs static files to `frontend/dist`, which you can serve with any static
file host, or point the Express server at (not wired up by default, since the
dev setup above is simplest for personal/local use).

---

## Notes on the numbers

- **Interest** is calculated automatically based on the interest type/rate you set
  and the time elapsed since the date borrowed — you don't need to update it manually.
- **Status** (Pending / Partially Paid / Fully Paid / Overdue) is calculated from
  repayments and the due date, except "Defaulted" which you set manually and which
  always sticks once set.
- **Outstanding Balance** = amount borrowed + interest accrued − total repaid.

## Security note

This is built for personal, local use. The login gives basic password protection,
but if you ever deploy this somewhere reachable over the internet (rather than
running it on your own machine), use HTTPS and set a strong, random `JWT_SECRET`
in `backend/.env`.
