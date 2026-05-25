import { bodyText, eyebrow, headingH2 } from "@/lib/marketing/design-tokens";

type SectionHeaderProps = {
  eyebrowText?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  eyebrowText,
  title,
  description,
  align = "left",
  className = "",
}: SectionHeaderProps) {
  const alignClass = align === "center" ? "text-center mx-auto items-center" : "";

  return (
    <header className={`max-w-3xl flex flex-col ${alignClass} ${className}`}>
      {eyebrowText ? <p className={`${eyebrow} mb-3`}>{eyebrowText}</p> : null}
      <h2 className={headingH2}>{title}</h2>
      {description ? (
        <p className={`${bodyText} mt-4 max-w-2xl ${align === "center" ? "mx-auto" : ""}`}>
          {description}
        </p>
      ) : null}
    </header>
  );
}
