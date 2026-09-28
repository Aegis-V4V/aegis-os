# Aegis OS

[![Namespace](https://img.shields.io/badge/namespace-Aegis--V4V-1B4F72)](https://alanwoodyard.com)
[![Stack](https://img.shields.io/badge/stack-Node_Express_%2B_dhive_%2B_DuckDB-1A5276)](https://alanwoodyard.com)
[![IP](https://img.shields.io/badge/IP-open__core_%7C_Apache--2.0-196F3D)](https://alanwoodyard.com)

[Alan Woodyard](https://alanwoodyard.com)

## System Role

Aegis OS is the Value4Value audio streaming and Podcasting 2.0 ingest system. It scores shows, watches Podping, and runs the Aether playout queue, with Hive transfers as the value path.

Registered tagline: Podcasting 2.0 scorecard, Podping spider, and Aether playout queue. Harvest maturity: working core (11,697 implementation LOC, 1,836 test LOC).

## Audited Architecture & Runtime

npm root `aegis-console` 1.0.0 (`build`, `test`). Application package `apps/aegis-os` 3.0.0.

Node dependencies harvested: `express`, `@hiveio/dhive`, `duckdb`, `axios`, `ws`, `pg`, `sqlite3`, `fast-xml-parser`, `node-cron`, `cors`, `express-basic-auth`, `dotenv`. Catalog stack also names Node 24 native `node:sqlite` (`DatabaseSync` ABI 137) and TypeScript. The harvested server imports include both `sqlite3` and `pg`; DuckDB is the analytical store (`duckdb` on Node, and `duckdb` on the Python package).

Python workspace member `apps/aegis-os` (`flask`, `requests`, `duckdb`): `audit_brain.py`, `brain_api.py`, `reaper.py`, `scout.py`, `data_pipeline.js` beside them. Frontend: Vite under `apps/aegis-os/frontend`. Discord bot: `apps/discord-bot` (`discord.js`, `express-session`, `sql.js`).

Hive reads and broadcasts go through `@hiveio/dhive`. Podcast XML goes through `fast-xml-parser`. WebSockets (`ws`) carry live playout signals.

## CLI / API Surface

npm scripts: root `build`, `test`; app `build`, `setup`, `start`, `test`, `postinstall`; frontend `dev`, `build`, `preview`; bot `dev`, `start`, `deploy-commands`.

HTTP routes harvested from the API:

- `GET /health`
- `GET /api/random-top`
- `GET /api/search`
- `GET /api/scan`
- `POST /api/invoice`
- `POST /api/login`
- `POST /api/deposit`
- `POST /api/paypal/create-order`
- `POST /api/paypal/capture-order`
- `POST /api/strike/create-invoice`
- `POST /api/strike/check-status`
- `POST /api/boost`
- `POST /api/support-aegis`
- `POST /api/boost-artist`
- `POST /api/verify-ledger`
- `POST /api/pay-basic-scan`
- `POST /api/report-email`
- `GET /api/auth/login`
- `GET /api/auth/callback`
- `GET /api/auth/user`

Value routes (`boost`, `deposit`, `invoice`, PayPal, Strike) are the V4V edge. `verify-ledger` checks a Hive-side claim. Search and scan serve the Podcasting 2.0 scorecard.

## Operational Boundaries

Public open core, Apache-2.0. Podcast metadata ingest is the open path. Payment credentials for PayPal and Strike belong in the environment of the deployment, not in the repository.

Hive account authority stays with the operator who holds the keys. This service posts transfers it was asked to post. It does not custody a listener's keys inside the scorecard database. DuckDB and SQLite files are local analytical and session stores. Postgres (`pg`) is the optional shared store where a deployment has already chosen one.
