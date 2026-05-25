import Link from "next/link";

interface AdminChromeProps {
  breadcrumb: string;
  children: React.ReactNode;
}

export function AdminChrome({ breadcrumb, children }: AdminChromeProps) {
  return (
    <>
      <nav
        id="top-nav"
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border"
      >
        <div className="flex items-center gap-8">
          <Link
            href="/admin"
            className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            GeoTracker
          </Link>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
            {breadcrumb}
          </span>
        </div>
        <Link
          href="/admin"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
        >
          [← Return to Admin Dashboard]
        </Link>
      </nav>

      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between">
        {children}
      </main>
    </>
  );
}

export function AdminHubChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav
        id="top-nav"
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border"
      >
        <div className="flex items-center gap-8">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            GeoTracker
          </span>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter animate-pulse">
            OPERATOR CENTRAL
          </span>
        </div>
        <Link
          href="/"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
        >
          [← RETURN TO AUDIT PORTAL]
        </Link>
      </nav>
      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between">
        {children}
      </main>
    </>
  );
}
