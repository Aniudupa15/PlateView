# PlateView

**See it before you order it.** PlateView replaces flat menu photos with a true-to-scale AR/3D preview of each dish, right on the diner's own table.

This repo holds the [product design doc](./PLATEV_1.pdf) and a prototype covering Phase 0 (AR-preview validation) plus the start of Phase 2 (restaurant admin dashboard): a QR-menu-style web app backed by a real API and database, with AR/3D dish previews and a single-restaurant admin for managing the menu.

## Live demo

Deployed on [Render](https://render.com) — see [Deployment](#deployment) below to stand up your own.

## Features

- **Digital menu** — category browsing, text search, dietary/allergen filters, spice level filter.
- **AR / 3D dish preview** — tap a dish to view a true-to-scale, rotatable 3D model via [`<model-viewer>`](https://modelviewer.dev). Launches AR on supported devices (ARKit/ARCore); falls back to an on-screen rotatable viewer everywhere else.
- **Photo fallback** — items without a 3D asset yet just show a high-quality photo. Nothing is ever blocked on missing 3D content.
- **Restaurant admin dashboard** (`/admin`) — a password-protected screen for the restaurant owner/manager to add dishes, edit them, 86 (mark unavailable) or restore them, and delete them. Photos and 3D models are added as URLs — no file upload/storage pipeline yet.

## What's not built yet

Per the [phased roadmap](./PLATEV_1.pdf) (§9): cart/ordering, shared table cart, kitchen ticket sync, billing & split payment, sales analytics, and multi-restaurant/super-admin support (currently single-restaurant only).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, react-router-dom |
| AR / 3D rendering | [`@google/model-viewer`](https://modelviewer.dev) (WebXR / AR Quick Look / Scene Viewer) |
| API | Express + TypeScript (Node) |
| Database / ORM | PostgreSQL + Prisma |
| Auth | JWT (bcrypt-hashed password, single admin account) |
| Linting | Oxlint |

## Getting started

### Frontend

```bash
cd app
npm install
npm run dev
```

Open the printed local URL, browse the menu, and tap any item with an **AR** badge to see the 3D preview (desktop browsers show the rotatable fallback viewer; a phone with ARKit/ARCore support shows the real AR launch button).

Other commands (run from `app/`):

```bash
npm run build     # type-check + production build to app/dist
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

### API + database

Requires a Postgres instance (e.g. `docker run -d -e POSTGRES_USER=plateview -e POSTGRES_PASSWORD=plateview -e POSTGRES_DB=plateview -p 5433:5432 postgres:16-alpine`).

```bash
cd server
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma migrate dev # creates tables
npm run seed             # loads the demo menu + creates the admin account
npm run dev
```

The frontend defaults to `http://localhost:4000` for the API (override with `VITE_API_URL` in `app/.env`). Sign in at `/admin/login` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `server/.env`.

## Project structure

```
PlateView/
├── PLATEV_1.pdf         # Product design document
├── render.yaml           # Render Blueprint (static site + API + Postgres)
├── app/                   # React/Vite frontend
│   └── src/
│       ├── components/    # SearchBar, CategoryTabs, FilterBar, MenuItemCard, ArViewer
│       ├── pages/          # MenuPage, ItemPage, pages/admin/*
│       ├── context/        # MenuProvider — fetches the public menu once, shares it via context
│       ├── api.ts           # Typed fetch client for the API
│       └── data/menu.ts     # Shared types + fixed category/allergen lists (menu content itself lives in the DB)
└── server/                # Express + Prisma API
    ├── prisma/schema.prisma
    ├── prisma/seed.ts       # Loads prisma/seed-data.json + creates the admin account
    └── src/
        ├── routes/menu.ts   # GET /api/menu (public, available items only)
        └── routes/admin.ts  # POST /api/admin/login + protected menu CRUD
```

To add a 3D preview to a menu item, set that item's `modelUrl` to a compressed `.glb` URL from the admin dashboard (or directly in the database) — items without one automatically fall back to `photoUrl`.

## Deployment

[`render.yaml`](./render.yaml) is a Blueprint that provisions three resources: a Postgres database, the API as a Node web service, and the frontend as a static site with an SPA rewrite rule (required so client-side routes like `/item/:id` don't 404 on refresh).

1. On [Render](https://dashboard.render.com), go to **New → Blueprint** and connect this repo.
2. Render shows a preview of the three resources. You'll be prompted for the two secret values marked `sync: false` in `render.yaml`: **`ADMIN_EMAIL`** and **`ADMIN_PASSWORD`** for the restaurant admin's login — pick a real password here, it's what you'll use at `/admin/login` after deploy.
3. Click **Apply**. The database and API deploy first; the API's start command runs migrations and seeds the demo menu + admin account automatically on every deploy (safe — it's idempotent).
4. `render.yaml` assumes the static site is named `plateview` and the API `plateview-api` (giving predictable URLs `https://plateview.onrender.com` / `https://plateview-api.onrender.com`, wired into `VITE_API_URL` and `CORS_ORIGIN`). If Render assigns different subdomains because those names are taken, update those two env vars to match and redeploy both services.
5. The free Postgres and free web service plans are fine for trying this out, but confirm current limits/pricing on Render before relying on them (free databases are typically time-limited; free web services cold-start after inactivity).

To deploy the frontend manually instead: Root Directory `app`, Build Command `npm install && npm run build`, Publish Directory `dist`, env var `VITE_API_URL` set to your API's URL, and a rewrite rule `/*` → `/index.html`.
