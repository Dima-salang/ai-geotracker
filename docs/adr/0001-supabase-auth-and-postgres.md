# Supabase Auth + PostgreSQL for prototype

Chose Supabase as the bundled auth provider and database for the prototype phase. Auth is OAuth-only (Google, LinkedIn) via Supabase Auth; the database is Supabase PostgreSQL. This bundles two services into one vendor with zero ops overhead and native Next.js SSR support. The trade-off is vendor lock-in to Supabase-adjacent patterns (RLS, Supabase JS client), accepted because the prototype may be replaced by a cloud solution later. If the product continues, the database can be migrated to standalone PostgreSQL.
