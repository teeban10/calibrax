# Database Migrations Guide

This project uses [Drizzle Kit](https://orm.drizzle.team/docs/kit-docs/overview) for database migrations.

## Quick Start

### First Time Setup

1. **Set up your database connection:**
   ```bash
   # Create a .env file in the backend directory
   echo "DATABASE_URL=postgresql://user:password@localhost:5432/dbname" > .env
   ```

2. **Create the database tables:**
   ```bash
   # Option A: Push schema directly (fastest for development)
   pnpm db:push
   
   # Option B: Generate and run migrations (recommended)
   pnpm db:generate
   pnpm db:migrate
   ```

## Available Commands

### `pnpm db:generate`
Generates migration files based on schema changes in `src/db/schema.ts`.

**When to use:**
- After modifying the schema
- Before committing schema changes
- To create version-controlled migration files

**Output:**
- Creates SQL migration files in `./drizzle/` directory
- Each migration is timestamped and includes the SQL to apply changes

### `pnpm db:push`
Pushes the schema directly to the database without generating migration files.

**When to use:**
- Development/testing environments
- Quick prototyping
- When you don't need migration history

**⚠️ Warning:** This will modify your database schema directly. Use with caution in production.

### `pnpm db:migrate`
Applies pending migrations to the database.

**When to use:**
- After generating migrations
- When deploying to a new environment
- To sync database schema with code

### `pnpm db:studio`
Opens Drizzle Studio, a web-based database GUI.

**When to use:**
- To browse and edit data visually
- For debugging and data inspection

## Workflow

### Development Workflow

1. **Make schema changes** in `src/db/schema.ts`
2. **Generate migration:**
   ```bash
   pnpm db:generate
   ```
3. **Review the generated SQL** in `drizzle/` directory
4. **Apply migration:**
   ```bash
   pnpm db:migrate
   ```
5. **Commit both schema and migration files**

### Production Deployment

1. Ensure all migrations are committed to version control
2. Run migrations on deployment:
   ```bash
   pnpm db:migrate
   ```

## Troubleshooting

### "relation does not exist" error
This means tables haven't been created yet. Run:
```bash
pnpm db:push
```

### Migration conflicts
If migrations are out of sync:
1. Check migration files in `drizzle/` directory
2. Ensure `DATABASE_URL` points to the correct database
3. Consider resetting the database in development (⚠️ data loss)

### Schema changes not detected
- Ensure schema file is saved
- Check that `drizzle.config.ts` points to the correct schema path
- Try running `pnpm db:generate` with verbose output

## Migration Files

Migration files are stored in `./drizzle/` directory:
- SQL files: `0000_*.sql` - Contains the actual migration SQL
- Meta files: `.meta/` - Drizzle internal metadata (gitignored)

**Important:** Always commit SQL migration files to version control, but the `.meta/` folder is gitignored.
