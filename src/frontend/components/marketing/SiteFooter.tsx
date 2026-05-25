import Link from "next/link";
import { MARKETING_NAV_LINKS } from "@/lib/marketing/nav-links";
import { bodySmall, eyebrow, marketingContainer } from "@/lib/marketing/design-tokens";

export function SiteFooter() {
  return (
    <footer id="site-footer" className="w-full border-t border-border bg-surface-container-low">
      <div className={`${marketingContainer} py-10 flex flex-col md:flex-row gap-8 md:gap-12 justify-between`}>
        <div>
          <p className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
            GeoTracker
          </p>
          <p className={`${bodySmall} mt-2 max-w-xs`}>
            See whether AI recommends your business—and get a clear plan to win more local customers.
          </p>
        </div>

        <div className="flex flex-wrap gap-10">
          <div>
            <p className={`${eyebrow} mb-3 text-foreground`}>Explore</p>
            <ul className="space-y-2">
              {MARKETING_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-mono text-xs uppercase text-text-muted hover:text-primary transition-colors min-h-11 inline-flex items-center"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={`${eyebrow} mb-3 text-foreground`}>Contact</p>
            <a
              href="mailto:sales@iozera.ai"
              className="font-mono text-xs uppercase text-text-muted hover:text-primary transition-colors min-h-11 inline-flex items-center"
            >
              sales@iozera.ai
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 md:px-10 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span className="font-mono text-[10px] uppercase text-text-muted tracking-tighter">
          © {new Date().getFullYear()} GeoTracker · Houston, Texas
        </span>
        <span className="font-mono text-[10px] uppercase text-text-muted tracking-tighter">
          Built for local business owners
        </span>
      </div>
    </footer>
  );
}
