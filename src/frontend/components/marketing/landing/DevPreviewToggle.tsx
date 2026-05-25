"use client";

type DevPreviewToggleProps = {
  active: boolean;
  onToggle: () => void;
};

/**
 * Nearly invisible control for toggling blob + results dashboard preview.
 * Hover the bottom-left corner of the viewport to reveal.
 */
export function DevPreviewToggle({ active, onToggle }: DevPreviewToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`fixed bottom-2 left-2 z-[70] w-4 h-4 border transition-opacity touch-manipulation ${
        active
          ? "opacity-30 border-primary bg-primary/20 hover:opacity-60"
          : "opacity-[0.06] border-foreground/40 bg-foreground/10 hover:opacity-25"
      }`}
      aria-label={active ? "Hide UI preview" : "Show UI preview"}
      aria-pressed={active}
      title={active ? "Preview: on" : "Preview: off"}
    />
  );
}
