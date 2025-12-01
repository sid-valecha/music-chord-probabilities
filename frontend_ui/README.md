# Frontend UI

Next.js frontend for visualizing chord progression probabilities.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Ensure JSON model files are in `public/data/`:
   - `unigram.json`
   - `bigram.json`
   - `trigram.json`

   These should be copied from `backend_pipeline/exports/` after running the backend pipeline.

## Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

Build for production:
```bash
npm run build
```

The static export will be in the `out/` directory, ready for deployment to Netlify or any static hosting service.

## Features

- Interactive chord progression builder
- Real-time probability visualization with bubble sizes
- Interpolation-based probability computation with soft backoff
- Responsive design

## Architecture

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Client-side probability computation** using pre-computed N-gram models

