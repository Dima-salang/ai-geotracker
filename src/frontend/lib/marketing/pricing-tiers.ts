export type PricingTier = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href?: string;
  highlighted?: boolean;
  badge?: string;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "See where you stand—no credit card required.",
    features: [
      "Free visibility check on your website",
      "Score from 0–100 with plain-language summary",
      "Top gaps holding you back",
      "Weekly email snapshot (optional)",
      "Side-by-side competitor mentions",
    ],
    cta: "Start free check",
    href: "/",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$49",
    period: "per month",
    description: "For owners who want unlimited checks and a full action plan.",
    features: [
      "Everything in Free",
      "Unlimited visibility checks",
      "Step-by-step website and listing fixes",
      "Deeper competitor comparison",
      "Priority support",
    ],
    cta: "Talk to sales",
    href: "mailto:sales@iozera.ai?subject=GeoTracker%20Premium",
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "ultra",
    name: "Done for you",
    price: "$150",
    period: "per month",
    description: "We implement the fixes so you can focus on running the business.",
    features: [
      "Everything in Premium",
      "Hands-on site and listing updates",
      "Ongoing monitoring and tune-ups",
      "AI-ready business page",
      "Direct line to your specialist",
    ],
    cta: "Talk to sales",
    href: "mailto:sales@iozera.ai?subject=GeoTracker%20Done-for-you",
  },
];
