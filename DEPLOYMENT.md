# Deployment Guide: Vercel + Supabase

## Overview
- **Frontend**: Vite React app → Vercel Static Hosting
- **Backend**: Express server → Vercel Node.js Runtime
- **Database**: Supabase Postgres

## Prerequisites
1. GitHub account (push code here)
2. Vercel account (free: https://vercel.com)
3. Supabase account with credentials (you already have):
   - `SUPABASE_URL`: `https://icunltrxwvbmjjyynibc.supabase.co`
   - `SUPABASE_ANON_KEY`: (your publishable key)

## Step 1: Use Migration Script

First, run the database schema on Supabase (from your local machine):

```bash
# Copy this exactly (with encoded password)
export PGPASSWORD='@Nrok47ck47'
psql -h db.icunltrxwvbmjjyynibc.supabase.co -U postgres -d postgres -p 5432 -f sql/supabase_schema.sql
```

Or use `npm run migrate-db` if you have it set up locally.

## Step 2: Push to GitHub

```bash
# Ensure you're on the feat/ghost-system branch (or main after merging PR)
git add .
git commit -m "chore: add Vercel deployment config"
git push origin feat/ghost-system
```

## Step 3: Deploy to Vercel

### Option A: CLI (Recommended for Quick Setup)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel
```

### Option B: Vercel Web Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Select your GitHub repository (`nrok47/peelog-game`)
3. Choose framework: **Vite**
4. Set Environment Variables:
   - `SUPABASE_URL` = `https://icunltrxwvbmjjyynibc.supabase.co`
   - `SUPABASE_ANON_KEY` = (your publishable key from Supabase)
5. Click **Deploy**

### Option C: GitHub Actions (Auto-deploy on push)

Vercel automatically integrates with GitHub. When you push to GitHub:
1. Vercel detects the push
2. Builds the project
3. Deploys automatically to a live URL

## Step 4: Verify Deployment

After deployment, Vercel will give you a URL like:
```
https://peelog-game-xxxx.vercel.app
```

Test it:
- Open the URL in browser
- Try logging in and creating a profile
- Check if Supabase is reachable (see debug info)

## Environment Variables on Vercel

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
SUPABASE_URL=https://icunltrxwvbmjjyynibc.supabase.co
SUPABASE_ANON_KEY=<your_publishable_key>
```

## Troubleshooting

### 502 Bad Gateway
- Check if `server.ts` is running properly
- Verify Supabase credentials are set in Vercel env

### Connection to Supabase Failed
- Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Check Supabase project is active (not paused)

### Build Fails
- Run `npm run build` locally to test
- Check logs in Vercel Dashboard → Deployments

## Local Development

To test before deploying:

```bash
# Install dependencies
npm install

# Set local env (optional)
export SUPABASE_URL=https://icunltrxwvbmjjyynibc.supabase.co
export SUPABASE_ANON_KEY=<your_key>

# Run dev server
npm run dev
# Opens http://localhost:5173 (React) 
# Backend at http://localhost:3000 (Express)
```

## Free Tier Limits (Vercel)
- **Deployments**: Unlimited
- **Serverless Functions**: 100 GB-hours/month (plenty for hobby)
- **Static Hosting**: Unlimited bandwidth
- **No credit card** required to start

## Next Steps After Deploy
1. Test the app on Vercel URL
2. If stable, merge `feat/ghost-system` to `main`
3. Set up Supabase Row Level Security (RLS) for production
4. Add authentication (optional: Supabase Auth)

---

**Questions?** Check Vercel docs: https://vercel.com/docs
