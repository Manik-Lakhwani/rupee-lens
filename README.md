# 👁 RupeeLens — Setup Guide

> AI-powered spending habits for UPI users. Built with Next.js 14, Supabase, and Claude AI.

---

## 🚀 You need 3 things to launch

1. **Supabase account** (free) — your database + auth
2. **Anthropic API key** — for AI insights
3. **Vercel account** (free) — to deploy

---

## STEP 1 — Get your Supabase credentials

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `rupee-lens`, pick a region close to India (Singapore), set a password
3. Wait ~2 minutes for it to spin up
4. Go to **Settings → API**
5. Copy:
   - **Project URL** → looks like `https://abcxyz.supabase.co`
   - **anon public key** → long string starting with `eyJ...`

---

## STEP 2 — Set up your database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned"

---

## STEP 3 — Get your FREE Gemini API key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account (Gmail works!)
3. Click **Create API Key**
4. Copy the key (starts with `AIza...`)
5. Done! It is completely FREE — no credit card needed

---

## STEP 4 — Set up the project locally

### Install VS Code
Download from [code.visualstudio.com](https://code.visualstudio.com) if you don't have it.

### Install Node.js
Download from [nodejs.org](https://nodejs.org) — get the LTS version.

### Open the project
1. Unzip the `rupee-lens` folder
2. Open VS Code
3. File → Open Folder → select the `rupee-lens` folder

### Create your environment file
1. In VS Code, find the file `.env.local.example`
2. Right-click → **Rename** → change it to `.env.local`
3. Open the file and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Install dependencies
1. In VS Code, press **Ctrl+`** (backtick) to open the terminal
2. Type this and press Enter:
```
npm install
```
Wait for it to finish (1-2 minutes).

### Run the app
```
npm run dev
```

Open your browser and go to: **http://localhost:3000**

You should see the RupeeLens welcome screen! 🎉

---

## STEP 5 — Enable Phone Auth in Supabase

For OTP login via phone:
1. Supabase Dashboard → **Authentication → Providers**
2. Enable **Phone** provider
3. For testing, you can also use **Email** OTP which works out of the box

---

## STEP 6 — Deploy to Vercel (go live!)

1. Push your code to GitHub:
   - Create a repo at [github.com](https://github.com)
   - Upload your project files

2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. In **Environment Variables**, add the same 3 variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
5. Click **Deploy**

Your app will be live at `https://your-project.vercel.app` in ~2 minutes!

---

## 📱 Install as mobile app

Since RupeeLens is a PWA (Progressive Web App):

**On iPhone:**
1. Open your Vercel URL in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"

**On Android:**
1. Open in Chrome
2. Tap the 3-dot menu
3. Tap "Add to Home Screen"

It will look and feel like a native app!

---

## 🗺 App Structure

```
rupee-lens/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Welcome screen
│   │   ├── auth/page.tsx         ← Login (OTP)
│   │   ├── dashboard/page.tsx    ← Home with insights + score
│   │   ├── import/page.tsx       ← Add transactions (SMS/Upload/Manual)
│   │   ├── insights/page.tsx     ← Full insights feed
│   │   ├── weekly/page.tsx       ← Weekly comparison
│   │   ├── settings/page.tsx     ← Profile + data management
│   │   └── api/
│   │       ├── analyze-sms/      ← Claude AI SMS parser
│   │       ├── parse-statement/  ← Claude AI PDF/image parser
│   │       └── generate-insights/← Claude AI insight generator
│   ├── components/
│   │   ├── layout/BottomNav.tsx  ← Bottom navigation
│   │   └── insights/
│   │       ├── InsightCard.tsx   ← The main UI card
│   │       ├── HabitScoreRing.tsx← Animated score ring
│   │       └── SpendingChart.tsx ← Donut + legend
│   ├── lib/
│   │   ├── sms-parser.ts         ← Local UPI SMS regex parser
│   │   ├── insights-engine.ts    ← Habit detection logic
│   │   └── supabase/             ← DB client
│   └── types/index.ts            ← TypeScript types
├── supabase-schema.sql           ← Run this in Supabase
├── .env.local.example            ← Rename & fill this
└── README.md                     ← This file
```

---

## 🤖 How the AI works

1. **SMS Analysis** — Paste any UPI/bank SMS. Local regex parses it instantly; Claude AI handles edge cases.
2. **Statement Upload** — Upload a PDF or screenshot. Claude extracts all debit transactions with amounts, dates, merchants.
3. **Insight Generation** — After transactions are saved, Claude generates human-language habit cards like:
   - *"You ordered food 9 times this week, mostly after 10 PM"*
   - *"Your chai habit costs ₹180/day — that's ₹5,400/month"*

---

## 💰 Cost estimate

- **Supabase** — Free tier (up to 500MB database, 50k auth users)
- **Vercel** — Free tier (unlimited personal projects)
- **Gemini** — FREE (1,500 requests/day on free tier). More than enough!

---

## ❓ Common issues

**"Cannot find module" error**
→ Run `npm install` again

**"Invalid API key"**
→ Check your `.env.local` file — make sure there are no spaces around the `=` sign

**OTP not arriving**
→ Use Email OTP for testing. Phone OTP requires Twilio setup in Supabase.

**Blank page after login**
→ Make sure you ran the SQL schema in Supabase

---

Built with ❤️ for young India 🇮🇳
# rupee-lens
# rupee-lens
# rupee-lens
