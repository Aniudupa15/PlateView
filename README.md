# PlateView

**See it before you order it.** PlateView replaces flat menu photos with a true-to-scale AR/3D preview of each dish, right on the diner's own table.

This repo holds the [product design doc](./PLATEV_1.pdf) and a Phase 0 clickable prototype: a QR-menu-style web app with search, filtering, and an AR/3D dish viewer that falls back gracefully to a photo when no 3D asset exists yet.

## Live demo

Deployed on [Render](https://render.com) as a static site — see [Deployment](#deployment) below to stand up your own.

## Features

- **Digital menu** — category browsing, text search, dietary/allergen filters, spice level filter.
- **AR / 3D dish preview** — tap a dish to view a true-to-scale, rotatable 3D model via [`<model-viewer>`](https://modelviewer.dev). Launches AR on supported devices (ARKit/ARCore); falls back to an on-screen rotatable viewer everywhere else.
- **Photo fallback** — items without a 3D asset yet just show a high-quality photo. Nothing is ever blocked on missing 3D content.

## What's not built yet

Per the [phased roadmap](./PLATEV_1.pdf) (§9): cart/ordering, shared table cart, kitchen ticket sync, billing & split payment, and the restaurant admin dashboard. This repo currently covers the Phase 0 AR-preview validation step.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript, Vite |
| Routing | react-router-dom |
| AR / 3D rendering | [`@google/model-viewer`](https://modelviewer.dev) (WebXR / AR Quick Look / Scene Viewer) |
| Linting | Oxlint |

## Getting started

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
npm run lint      # oxlint
```

## Project structure

```
PlateView/
├── PLATEV_1.pdf        # Product design document
├── render.yaml          # Render Blueprint (static site + SPA rewrite)
└── app/                  # The React/Vite application
    ├── src/
    │   ├── components/   # SearchBar, CategoryTabs, FilterBar, MenuItemCard, ArViewer
    │   ├── pages/         # MenuPage, ItemPage
    │   └── data/menu.ts   # Menu content (id, price, dietary tags, allergens, modelUrl, ...)
    └── public/
```

To add a 3D preview to a menu item, drop a compressed `.glb` URL into that item's `modelUrl` field in `app/src/data/menu.ts` — items without one automatically fall back to `photoUrl`.

## Deployment

This repo includes a [`render.yaml`](./render.yaml) Blueprint that deploys `app/` as a Render static site with an SPA rewrite rule (required so client-side routes like `/item/:id` don't 404 on refresh).

1. On [Render](https://dashboard.render.com), go to **New → Blueprint** and connect this repo.
2. Render detects `render.yaml` and provisions a static site (`rootDir: app`, build `npm install && npm run build`, publish dir `dist`).
3. Click **Apply**.

To deploy manually instead, set: Root Directory `app`, Build Command `npm install && npm run build`, Publish Directory `dist`, and add a rewrite rule `/*` → `/index.html`.
