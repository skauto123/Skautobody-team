# SK Autobody team calendar

A small shared calendar for SK Autobody. Michael (the owner) adds teammates, assigns tasks to days, and checks completion. Each teammate signs in and sees only their own tasks. They can mark a task done or not done. The owner’s status page shows completed/total for each person, each day, and the whole team.

Data is stored in a real database (SQLite on your machine, Postgres when you deploy). Check-offs are shared, so the owner sees them after a refresh.

## Run locally

You need Node.js 22 or newer.

```bash
cp .env.example .env
```

Edit `.env` and set `OWNER_PASSWORD` to a password of at least 8 characters. Do not commit `.env`. This GitHub repo is public.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with `OWNER_USERNAME` and `OWNER_PASSWORD`.

The app creates `data/sk-autobody.db` the first time it starts, and creates the owner account only if one does not exist yet. Changing `OWNER_PASSWORD` later does not reset an existing owner. To start over locally, stop the app and delete `data/sk-autobody.db`.

```bash
npm test
npm run build
npm start
```

## How to use it

**Owner**

1. Sign in with the username and password from `.env`.
2. Open **Team** and add each person: name, username, and a PIN (4 or more characters). Tell them those two values.
3. Open **Calendar**. Use **Week** or **Month**, and **Today** / the arrows to move around.
4. Choose **Add**, pick the teammate, type the task, and tap the days it belongs on. Each day becomes its own task. Tap a task to edit or delete it.
5. Open **Status** for the same week or month. A cell like `2/3` means two of three tasks are done. **Total** is that person for the whole week or month. The **Team** row is everyone together. Refresh the page to load the latest check-offs.

**Teammate**

1. Sign in with the username and PIN the owner gave you.
2. The calendar shows only your tasks.
3. Tap a task to mark it done (it is crossed off) or tap it again to mark it not done.
4. The owner sees that change on **Status** after they open or refresh the page.

## Deploy

SQLite is a file on disk. It is the right database for a single long-running Node server. It does not persist on Vercel’s serverless filesystem. On Vercel, set `DATABASE_URL` to Postgres.

### Vercel + Neon (free tiers)

1. Create a project at [Neon](https://neon.tech) and copy the pooled Postgres connection string.
2. Import this GitHub repo in [Vercel](https://vercel.com).
3. Set these environment variables for Production (and Preview, if you use it):
   - `OWNER_USERNAME`
   - `OWNER_PASSWORD` (8 or more characters)
   - `OWNER_DISPLAY_NAME` (optional, defaults to Michael)
   - `DATABASE_URL` (the Neon string, including `sslmode=require`)
4. Deploy. The first request creates the tables and the owner account.

Do not put real passwords in the repo, in build logs you commit, or in screenshots.

### A Node host with a disk

Railway, Fly.io, a small VPS, or any host that runs `npm run build && npm start` can use SQLite. Set `OWNER_USERNAME`, `OWNER_PASSWORD`, and optionally `SQLITE_PATH` to a persistent disk. Run one Node process so everyone shares the same file.

If you set `DATABASE_URL` to a `postgres://` or `postgresql://` string, the app uses Postgres instead of SQLite on that host too.
