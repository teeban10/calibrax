# Backend API

This service exposes the pricing intelligence API described in the plan, backed by Express, Drizzle ORM, Postgres, and Zod.

## Requirements

- `DATABASE_URL` pointing to Postgres
- `PORT` (optional, defaults to `4000`)

## Commands

- `pnpm dev` – run `ts-node-dev` against `src/index.ts`
- `pnpm build` – compile TypeScript into `dist/`
- `pnpm start` – run the compiled server

Install dependencies using `pnpm install` from `/backend`, which will also populate the lockfile and install the dev dependencies defined in `package.json`.

