# Graphify Scope

## Besonders beachten
- `src`
- `src`
- `package.json`
- `vite.config.js`
- `package.json`
- `vite.config.js`

## Ignorieren
- `.env`
- `.env.*`
- `*.pem`
- `*.key`
- `*.p12`
- `*.sqlite`
- `*.db`
- `node_modules/`
- `.next/`
- `dist/`
- `build/`
- `.turbo/`
- `.cache/`
- `coverage/`
- `tmp/`
- `venv/`
- `.venv/`
- `graphify-out/cost.json`
- `graphify-out/cache/`

## Wichtige Dateien
- `package.json`
- `vite.config.js`
- `package.json`
- `vite.config.js`

## Sensible Dateien, nicht lesen
- `.env`
- `.env.*`
- `*.pem`
- `*.key`
- `*.p12`
- `*.sqlite`
- `*.db`
- Any local credentials, tokens, exports, private data dumps, or production backups.

## Fuer Codex spaeter besonders wichtig
- Start with Graphify architecture and path queries.
- Prefer files listed as entrypoints before broad raw file reads.
- Confirm whether `graphify-out` should be committed or ignored per project.
