"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { MARKETING_NAV_LINKS, isNavActive } from "@/lib/marketing/nav-links";
import { btnPrimary, navLink } from "@/lib/marketing/design-tokens";
import { supabase } from "@/utils/supabase";

type SiteNavbarProps = {
  onSignInClick?: () => void;
};

export function SiteNavbar({ onSignInClick }: SiteNavbarProps) {
  const pathname = usePathname();
  const menuId = useId();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleAccountClick = async () => {
    if (userEmail) {
      await supabase.auth.signOut();
      return;
    }
    onSignInClick?.();
  };

  return (
    <header className="fixed top-0 w-full z-50">
      <nav
        id="top-nav"
        className="flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border"
        aria-label="Main"
      >
        <div className="flex items-center gap-6 md:gap-10 min-w-0">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors shrink-0"
          >
            GeoTracker
          </Link>
          <div className="hidden md:flex gap-6">
            {MARKETING_NAV_LINKS.map((link) => {
              const active = isNavActive(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${navLink} ${
                    active
                      ? "text-primary font-bold border-b-2 border-primary"
                      : "text-text-muted font-medium hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {userEmail ? (
            <Link
              href="/dashboard"
              className={`${navLink} hidden sm:inline-flex text-primary font-bold hover:text-primary-hover`}
            >
              Dashboard
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleAccountClick}
            className={`${btnPrimary} hidden sm:inline-flex py-2 min-h-10`}
          >
            {userEmail ? "Sign out" : "Sign in"}
          </button>

          <button
            type="button"
            className="md:hidden font-mono text-xs uppercase font-bold border border-foreground px-3 py-2 min-h-11 min-w-11 touch-manipulation"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div
          id={menuId}
          className="md:hidden border-b border-border bg-background px-6 py-4 flex flex-col gap-1"
          role="dialog"
          aria-label="Mobile menu"
        >
          {MARKETING_NAV_LINKS.map((link) => {
            const active = isNavActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${navLink} py-3 ${
                  active ? "text-primary font-bold" : "text-text-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {userEmail ? (
            <Link href="/dashboard" className={`${navLink} py-3 text-primary font-bold`}>
              Dashboard
            </Link>
          ) : null}
          <button type="button" onClick={handleAccountClick} className={`${btnPrimary} mt-2 w-full`}>
            {userEmail ? "Sign out" : "Sign in"}
          </button>
        </div>
      ) : null}
    </header>
  );
}
