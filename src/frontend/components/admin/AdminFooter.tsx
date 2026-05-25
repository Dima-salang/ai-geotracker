export function AdminFooter() {
  return (
    <footer
      id="site-footer"
      className="w-full py-2 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center bg-surface-container-low border-t border-border h-16 gap-2"
    >
      <div className="font-mono text-xs font-bold text-foreground">GeoTracker Admin</div>
      <div className="font-mono text-[10px] uppercase text-text-muted">© 2024 GeoTracker Admin</div>
    </footer>
  );
}
