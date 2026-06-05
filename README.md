# Senior Frontend Interview Prep — Hub

Complete senior frontend / React FAANG interview prep, deep-dived. 12 playbooks · 168 parts · 674 topics, each with explanations + runnable code.

**Live:** https://prep-avinash.netlify.app

## Features
- Dashboard with progress ring + interview weightage
- 12 deep-dive playbooks (React internals, system design, DSA, performance, behavioral, production toolchain)
- Per-topic progress tracking (localStorage)
- Active-recall flashcards (674 cards)
- Full-text search across all topics
- 12-week roadmap

## Stack
Vite 6 + React 18. Content served from `public/data.json`.

## Develop
```bash
npm install
npm run dev
```

## Build
```bash
npm run build      # outputs to dist/
```

## Deploy
Auto-deploys to Netlify on push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

Manual:
```bash
npm run build
npx netlify-cli deploy --prod --dir=dist --site <SITE_ID>
```
