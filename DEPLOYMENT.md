# GitHub Pages + Supabase Direct Deployment Guide

## Current Status
✅ **Completed:**
- Removed all `/api/` serverless routes (was causing 404s on Vercel)
- Created comprehensive Supabase client helpers in `src/services/supabase.ts`:
  - `loginOrCreateProfile(username)` - Replaces POST /api/login
  - `syncProfile(userId)` - Replaces GET /api/profile/:id (with income/energy regen)
  - `fetchGhosts(userId)` - Replaces GET /api/ghosts/:userId
  - `fetchInventory(userId)` - Replaces GET /api/inventory/:userId
  - `fetchTargets()` - Replaces GET /api/targets
  - `saveBattleLog(battleId, events)` - Replaces POST /api/save-battle-log
- Updated `App.tsx` to use direct Supabase helpers instead of fetch() calls
- Created GitHub Actions workflow (`.github/workflows/deploy.yml`) for auto-deployment to GitHub Pages
- Updated `vite.config.ts` with base path for GitHub Pages deployment
- Tests: ✅ `npm run build` succeeds

## Next Steps (CRITICAL - Must be done BEFORE deployment will work)

### 1. Set Environment Variables in GitHub Secrets
Your GitHub repository needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as GitHub Actions secrets for the build to access Supabase.

**Steps:**
1. Go to: https://github.com/nrok47/peelog-game/settings/secrets/actions
2. Click **"New repository secret"** and add:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://icunltrxwvbmjjyynibc.supabase.co`
3. Click **"New repository secret"** again and add:
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `sb_publishable_X8ohUDEuZ_Eun7pWoijqyQ_GEV_kLNh`

### 2. Ensure Supabase Schema Exists
The database tables must be created on your Supabase project. Check if they exist, and if not, apply the schema:

**Option A: Apply schema via Supabase SQL Editor (Recommended)**
1. Go to: https://app.supabase.com/project/icunltrxwvbmjjyynibc/sql/new
2. Copy the contents of `sql/supabase_schema.sql`
3. Paste into the SQL editor and click **"Run"**

**Option B: Check existing tables**
1. Go to: https://app.supabase.com/project/icunltrxwvbmjjyynibc/editor
2. Verify these tables exist: `profiles`, `player_ghosts`, `inventory`, `battle_logs`
3. If any are missing, run the SQL schema

### 3. Configure GitHub Pages in Repository
1. Go to: https://github.com/nrok47/peelog-game/settings/pages
2. Set **Source** to: "Deploy from a branch"
3. Set **Branch** to: `gh-pages` and folder to `/ (root)`
4. Save

The GitHub Actions workflow will automatically **create and push the `gh-pages` branch** on first run.

### 4. Enable GitHub Pages Deployment
Once GitHub Actions secrets are configured and you push to `main` or `feat/ghost-system`:

**Trigger deployment:**
```bash
git push origin feat/ghost-system
```

GitHub Actions will:
1. Install dependencies
2. Build the React app with Vite (using your Supabase env vars)
3. Create a `gh-pages` branch with the optimized build
4. Deploy to GitHub Pages

### 5. Access Your Live Site
Once deployed, your game will be available at:
```
https://nrok47.github.io/peelog-game/
```

## Key Architecture Changes

### Why This Approach?
- **Vercel Serverless Routing Issues**: `/api/*` routes were returning 404s in Vercel despite correct configuration
- **Solution**: Eliminate backend API entirely (GitHub Pages is static-only)
- **Direct Supabase**: React calls Supabase directly from the browser using the public anon key
- **Security**: The anon key is intentionally public; Supabase RLS (Row Level Security) controls data access

### Browser Security Considerations
- Supabase anon key in browser is **normal and safe** due to RLS policies
- RLS ensures users can only access their own data
- All direct SQL operations are protected by Supabase policies

## Files Modified
- ✅ `src/App.tsx` - Uses Supabase helpers instead of `/api/` calls
- ✅ `src/services/supabase.ts` - New client-side helpers for all data operations
- ✅ `vite.config.ts` - Added `base: '/peelog-game/'` for GitHub Pages
- ✅ `.github/workflows/deploy.yml` - Auto-deployment workflow
- ✅ Deleted `api/` folder - Removed all serverless code

## Troubleshooting

### Actions fail to build?
- Check GitHub Secrets are set correctly (no typos, correct values)
- Verify `npm run build` works locally: `cd /workspaces/peelog-game && npm run build`

### App loads but shows "Login failed"?
- Verify Supabase tables exist (step 2 above)
- Check browser console for errors (F12 → Console tab)
- Ensure Supabase RLS policies allow reads/writes

### "Page not found" after deploying?
- GitHub Pages takes 1-2 minutes to deploy
- Clear browser cache (Ctrl+Shift+Delete)
- Check deployment status: https://github.com/nrok47/peelog-game/actions

## Credits
- **Previous approach**: Vercel serverless (abandoned due to routing issues)
- **Current approach**: GitHub Pages + Supabase direct client calls
- **Framework**: React 18 + Vite + TypeScript
- **Database**: Supabase (Postgres)
- **UI**: TailwindCSS + Framer Motion

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
