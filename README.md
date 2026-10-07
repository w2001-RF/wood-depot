# Wood Depot — Sidi Yahya El Gharb

An interactive SPA where the 3D depot **is** the catalogue: visitors walk through a
procedural timber yard, inspect real-scale products, build a cart and send a quote
request on WhatsApp. A classic catalogue, plan view and configurator give the same
products without 3D.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # layout, collision, navigation, quote & configurator tests
npm run build        # typecheck + production build (dist/)
npm run build:single # one self-contained index.html (dist-single/)
```

## Configuration (`.env`, see `.env.example`)

| Variable | Purpose |
| --- | --- |
| `VITE_WHATSAPP_NUMBER` | Depot number, digits only (`2126…`). Empty = demo: WhatsApp opens its contact picker. |
| `VITE_BUSINESS_NAME`, `VITE_BUSINESS_PHONE` | Real identity. Empty = "Wood Depot" flagged as demo. |
| `VITE_LATITUDE`, `VITE_LONGITUDE` | Exact coordinates. Empty = map shows a search link; nothing is guessed. |
| `VITE_SEASONAL_MODE` | `true` shows the Eid charcoal campaign in the depot banner. |
| `VITE_DATA_SOURCE` | `mock` (default) or `supabase` (+ URL / anon key). Schema: `supabase/schema.sql`. |

QA only: `?quality=high|medium|low` forces a quality level; `?debug` exposes
`window.__wd` (stores, player runtime, `setPose`).

## Demo data

All 20 products, stock levels, gallery images and business details are **demo**.
No price is invented: every product is "Sur devis". Replace through the repository
layer (`src/services/catalogRepository.ts`) — the UI never imports data files for live data.

## How the depot is built

- `src/config/depotLayout.ts` — **the plan**. Zones, product placements, racks,
  greenhouse/trellis pieces, props and navigation waypoints. Rendering, collisions,
  interaction, minimap, guidance and the plan view all derive from it.
- `src/utils/depotWorld.ts` — colliders, interactables and pathfinding built from the plan.
- `src/components/3d/` — procedural textures (no downloads), instanced timber piles,
  `<InteractiveProduct />`, `<DepotZone />`, first-person controller, cinematic entrance,
  floor guidance, HUD, minimap, joystick, product viewer, plan-view fallback.

To add a product to the depot: add it to the data, then add a placement (and optionally
a rack) in `depotLayout.ts`. `npm test` fails if any product is not physically placed,
if a pile overlaps another, or if a pile cannot be reached on foot.

## Controls

Desktop: ZQSD / WASD or arrows to walk, Shift to run, drag to look, wheel to zoom,
E to examine. Mobile: floating joystick (push to the rim to run), swipe to look,
"Examiner" button. Without WebGL the depot opens as an interactive plan.

## Performance

Piles are instanced with 2 material groups (≈2 draw calls per pile); greenhouse and
trellis pieces are instanced yet individually selectable; roof, frames, racks and trees
are instanced. Low quality drops shadows, light shafts, particles and lamp lights;
an FPS monitor downgrades automatically once. Rendering pauses behind the product
inspector and when the home hero scrolls out of view.
