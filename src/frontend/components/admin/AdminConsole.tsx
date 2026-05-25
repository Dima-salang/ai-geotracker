"use client";

interface AdminConsoleProps {
  logs: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function AdminConsole({ logs, containerRef }: AdminConsoleProps) {
  return (
    <section className="w-full border-t border-foreground/10 bg-foreground text-background py-6 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary" />
            Console & Sync Logs
          </span>
          <span className="font-mono text-[9px] text-text-muted uppercase">
            System Status: Secure
          </span>
        </div>
        <div
          ref={containerRef}
          className="font-mono text-[10px] p-4 bg-background text-foreground border border-foreground/10 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none"
        >
          {logs.map((log, index) => (
            <div key={index} className="mb-1 border-b border-foreground/5 pb-0.5">
              {log}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
