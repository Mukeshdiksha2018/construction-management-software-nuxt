Supabase migrations guide
=========================

This project keeps SQL migrations in `database/migrations` and uses a symlink so the Supabase CLI can see them under `supabase/migrations`.

Prerequisites
-------------
- Supabase CLI installed (`supabase --version`).
- Project ref: `vedbaiayehsikimozsvb` (from your Supabase URL).
- (Optional, for local DB/diff/reset): Docker Desktop running.

One-time setup
--------------
Run from the project root (`/Users/mukeshkumar/Desktop/construction-management`):

```sh
mkdir -p supabase
rm -rf supabase/migrations
ln -s ../database/migrations supabase/migrations
```

Login to Supabase
-----------------
```sh
supabase login
```
Follow the prompt to open the browser and confirm. This stores your access token locally.

Link this repo to the Supabase project
--------------------------------------
```sh
cd /Users/mukeshkumar/Desktop/construction-management
supabase link --project-ref vedbaiayehsikimozsvb
```
You only need to re-run this if the link is removed or you switch projects.

Apply migrations to the remote database
---------------------------------------
```sh
cd /Users/mukeshkumar/Desktop/construction-management
mkdir -p supabase
rm -rf supabase/migrations
ln -s ../database/migrations supabase/migrations
supabase db push
```
This applies all migrations in order to the linked remote project. It will show the list and prompt to continue.

**Quick reset script (if tables were manually deleted):**
```sh
./scripts/reset-and-migrate.sh
```
This interactive script will guide you through clearing migration history and re-running migrations.

Seed the remote database
------------------------
Pick the seed file you want (examples live in `database/seeders/`).

- Newer CLI (v1.181+):
```sh
supabase db seed remote --file database/seeders/<seed_file>.sql
```

- Older syntax:
```sh
supabase db remote seed --file database/seeders/<seed_file>.sql
```

Verify on the remote database
-----------------------------
**Option 1: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/vedbaiayehsikimozsvb/editor
2. Click "Table Editor" in the left sidebar
3. You should see all your tables listed

**Option 2: Via SQL Editor (Recommended)**
1. Go to https://supabase.com/dashboard/project/vedbaiayehsikimozsvb/sql/new
2. Run this query to check applied migrations:
```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```
3. Run this query to list all tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
ORDER BY table_name;
```

**Option 3: Via psql (if you have Postgres connection string)**
```sh
psql "<your-postgres-connection-string>"
\dt
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
\q
```

Optional: local development database (requires Docker)
------------------------------------------------------
- Start services: `supabase start`
- Apply migrations + seed: `supabase db reset` (drops/recreates local DB and runs migrations; will also run `database/seed.sql` if present)
- Or apply pending only: `supabase db push`
- Seed a specific file locally: `supabase db seed --file database/seeders/<seed_file>.sql`
- Schema diff (remote vs local; uses Docker): `supabase db diff --linked --schema public`

Troubleshooting
---------------
**"Remote database is up to date" but no tables exist (tables manually deleted):**

If you manually deleted tables from the Supabase GUI, the migration tracking table still thinks they're applied. Reset and re-run migrations:

1. **Go to Supabase Dashboard SQL Editor**: https://supabase.com/dashboard/project/vedbaiayehsikimozsvb/sql/new

2. **Clear the migration history** (this tells Supabase to re-run all migrations):
   ```sql
   DELETE FROM supabase_migrations.schema_migrations;
   ```

3. **Verify tables are gone** (optional check):
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
   ```
   Should return no rows (or only system tables).

4. **Re-run migrations from terminal**:
   ```sh
   cd /Users/mukeshkumar/Desktop/construction-management
   supabase db push
   ```
   This will now re-apply all migrations and recreate all tables.

**"Remote database is up to date" but no tables exist (other causes):**
1. **Check if symlink exists**: `ls -la supabase/migrations` should show `migrations -> ../database/migrations`
2. **Verify migrations were actually applied**: Use SQL Editor in Supabase Dashboard to run:
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
   ```
3. **If migrations show as applied but tables don't exist**: The migrations may have failed silently. Check the Supabase Dashboard → Logs → Postgres Logs for errors.

**Duplicate migration version errors:**
- Rename the conflicting migration file to a unique timestamp, then rerun `supabase db push`.

**Docker errors (`Cannot connect to the Docker daemon`):**
- Only needed for local DB/diff/reset; install/start Docker Desktop or avoid those commands.

**Migrations not being detected:**
- Ensure you're in the project root directory
- Verify symlink: `ls -la supabase/migrations` should show the symlink
- Recreate symlink if needed:
  ```sh
  rm -rf supabase/migrations
  ln -s ../database/migrations supabase/migrations
  ```

