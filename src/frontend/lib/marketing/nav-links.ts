export type NavLink = {
  label: string;
  href: string;
  match?: "exact" | "prefix";
};

export const MARKETING_NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/", match: "exact" },
  { label: "Services", href: "/services", match: "prefix" },
  { label: "Pricing", href: "/pricing", match: "prefix" },
  { label: "FAQ", href: "/faq", match: "prefix" },
];

export function isNavActive(pathname: string, link: NavLink): boolean {
  if (link.match === "prefix") {
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  }
  return pathname === link.href;
}
