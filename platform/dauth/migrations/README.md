# DAuth Migrations

Physical home of every SQL migration owned by DAuth.

## Layout

```
platform/dauth/migrations/
├── README.md                # this file
├── migrations-index.json    # canonical ownership manifest (28 files)
├── public/                  # public + dos schema migrations (25 up + 18 down = 43 files)
└── tenant/                  # per-tenant schema migrations (3 up + 2 down = 5 files)
```

## How they get applied

`migration/migration-runner.ts` discovers migrations across multiple scan
roots and applies them in lexicographic order by filename. As of DAuth
Session 2 it includes `platform/<module>/migrations/` (recursively), so
files in `public/` and `tenant/` here are automatically picked up.

The runner uses `filename` as the primary key in `dos.platform_migrations`,
so this directory tree IS the home of the files — the previous location
under `modules/platform-core/db/{public,tenant}/migrations/` no longer
contains them.

For the `current_path` column tracked in `dos.platform_migrations`, the
runner refreshes the value on every successful scan. Operators upgrading
from Session-1 state will see the path silently update from
`modules/platform-core/db/...` to `platform/dauth/migrations/...` on the
next `migrate up` invocation; no manual backfill is needed.

## Validating ownership

```bash
node -e "
const fs=require('fs'),path=require('path');
const idx=require('./migrations-index.json');
let ok=0,bad=0;
for(const s of ['public','tenant']){
  for(const f of idx.ownedMigrations[s].files){
    if(!fs.existsSync(f.currentPath)){console.error('MISSING',f.currentPath);bad++}else{ok++}
    if(f.down){
      const d=path.join(path.dirname(f.currentPath),f.down);
      if(!fs.existsSync(d)){console.error('MISSING-DOWN',d);bad++}else{ok++}
    }
  }
}
console.log('OK',ok,'BAD',bad);
"
```

Expected: `OK 48 BAD 0`.

## When to add a new DAuth migration

1. Create the SQL file under `public/` or `tenant/` with a sequential or
   timestamped prefix (`YYYYMMDD_NNNN_*.sql` recommended for new files).
2. Provide a matching `*_down.sql` file unless the change is irreversible
   (in which case set `"down": null` in `migrations-index.json`).
3. Add an entry to `migrations-index.json#ownedMigrations.<scope>.files`
   with `filename`, `purpose`, `currentPath`, and `down`.
4. Run `validate ownership` block above to confirm filesystem and index
   agree.
5. Apply via `pnpm tsx migration/migration-runner.ts up` (or the wrapper
   that injects the platform pool).
