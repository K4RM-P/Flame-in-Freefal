# Project Max Q

The static dashboard, NASA image assets, and interactive physics modules live in `dist/`.
Run `python -m http.server 8000 --directory dist` and open http://localhost:8000 for local development.

## GitHub Pages

Copy the contents of `dist/` into a `docs/` folder in the GitHub repository. In Settings → Pages, choose Deploy from a branch, the default branch, and `/docs`. Keep the image directory and relative asset paths together. The dashboard can run with its local evidence collection.

## Merge into EmberAtlas

Compare both repositories before moving files. Treat `records` and `samples` in `dist/app.js` as the current evidence schema. Preserve the study IDs, sample identities, provenance links, units and distinction between measurements and model outputs. The `physics.js`, `sim.js` and `coverage.js` scripts use corresponding HTML controls and shared app data or helpers. Move each tool with its markup and styles, or adapt those dependencies to the destination framework.

## Hosted AI

This version retrieves local evidence and can optionally use a compatible browser's on-device model. A hosted OpenAI integration requires a server endpoint that calls the OpenAI API. During a merge, preserve the endpoint URL, request/response schema, origin configuration, and server-side environment secret. Keep the key outside Git and all browser assets. Test both a question with matching evidence and a question that should return insufficient evidence. Retain the local evidence path when the endpoint is unavailable.

### OpenAI setup

The server implementation is in `worker/index.mjs`. The build command is
`node worker/build.mjs`. Configure `OPENAI_API_KEY` as a hosted runtime secret
and optionally set `OPENAI_MODEL`. To deploy this version on Sites, use a worker
manifest without the static directory field and package the built worker.
Keep the site private while testing. The endpoint checks Sites identity,
same-origin requests and a per-instance request budget. A public deployment
needs its own access and rate-limiting strategy. GitHub Pages continues to
serve the static version and needs a separate server to run this endpoint.
