import { createClient } from "./supabase/client";

/** @deprecated Prefer `createClient()` from `@/utils/supabase/client` in new code */
export const supabase = createClient();
