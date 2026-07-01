# Ultra Race Nutrition Calculator

A browser-local nutrition planner for ultra-trail races. It calculates energy, carbohydrate, water, and sodium targets for the full race and for each segment between aid stations.

## Development

Requirements:

- Node.js 24 or newer
- npm

```bash
npm ci
npm run dev
```

The Vite development server prints the local URL.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e -- --project=chromium
```

## Deployment

The production build uses `/nutrition-calculator/` as its GitHub Pages base path. The included GitHub Actions workflow verifies, builds, and deploys the `dist` artifact after changes reach `main`.

In the GitHub repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

## Privacy

GPX files are parsed in the browser. Plans and processed course points are stored in IndexedDB and are not uploaded by the application.

## Specification

- [Product definition](docs/product.md)
- [Feature specification](specs/001-race-nutrition-calculator/spec.md)
- [Implementation plan](specs/001-race-nutrition-calculator/plan.md)
- [Task breakdown](specs/001-race-nutrition-calculator/tasks.md)
