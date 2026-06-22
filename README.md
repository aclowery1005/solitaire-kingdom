# Solitaire Kingdom

A Klondike solitaire web app with Supabase-backed auth, points, daily tasks,
and game session history.

## What's wired up

- **Auth**: email/password sign-up and sign-in via Supabase Auth, with
  required email verification (you must enable "Confirm email" in your
  Supabase project — see below).
- **Profiles**: points balance and cumulative play time, auto-created on
  sign-up via the `handle_new_user` trigger in your schema.
- **Daily tasks**: progress and claiming read/write from `task_progress`,
  task definitions read from `daily_tasks`.
- **Game sessions**: every win is logged to `game_sessions`.
- **Points tables**: the two points-based tiers (`pts-30`, `pts-850`) from
  the original design are live.

## What's intentionally not included

The original design included a hidden "head-to-head challenge" that unlocks
after 10 hours of play and pitches a $5 real-money wager, plus a set of
locked "cash table" tiers wired for a future payment provider. Those pieces
were removed rather than implemented. If you want a transparent, non-cash
version of additional game modes later, that's a separate, much simpler
feature to add.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and
   anon key (Project Settings > API in the Supabase dashboard). This repo's
   `.env` is already filled in with your project's values locally — don't
   commit it.
3. In Supabase, go to **Authentication > Providers > Email** and make sure
   **Confirm email** is turned ON. Without this, signups get a session
   immediately and the verification screen never appears.
4. `npm run dev` to run locally.

## Deploying (Vercel)

1. Push this project to a GitHub repo (see steps below if you're not sure
   how).
2. Go to vercel.com/new and import that repo. Vercel auto-detects Vite —
   no config needed.
3. Before clicking deploy, add two environment variables under
   **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same values as your local `.env`)
4. Click **Deploy**. You'll get a URL like
   `https://solitaire-kingdom-yourname.vercel.app`.
5. **Important**: back in Supabase, go to **Authentication > URL
   Configuration** and add your new Vercel URL to **Redirect URLs** (and
   optionally as the **Site URL**). Without this, the verification email
   link will redirect to the wrong place.

### Getting this project onto GitHub (if you haven't already)

1. Create a new empty repo at github.com/new — don't initialize it with a
   README.
2. In a terminal, inside this project folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Then proceed with the Vercel import steps above.

## Project structure

```
src/
  lib/
    supabaseClient.js   # Supabase client singleton
    gameData.js         # All DB read/write functions (tasks, sessions, points)
  contexts/
    AuthContext.jsx      # Session + profile state, auth actions
  pages/
    AuthScreen.jsx        # Sign in / sign up
    VerifyEmailGate.jsx   # Shown when signed in but unverified
    GameShell.jsx          # Lobby, tasks screen, game screen
  components/
    KlondikeGame.jsx       # The Klondike engine + board UI
  App.jsx                  # Routes between the above based on auth state
```
