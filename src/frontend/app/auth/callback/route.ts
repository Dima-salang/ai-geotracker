import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const authError = searchParams.get("error_description") ?? searchParams.get("error");

  if (authError) {
    const login = new URL("/", origin);
    login.searchParams.set("auth_error", authError);
    return NextResponse.redirect(login);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    const login = new URL("/", origin);
    login.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
