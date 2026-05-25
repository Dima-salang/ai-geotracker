export type BentoCard = {
  id: string;
  title: string;
  body: string;
  cta?: string;
  variant: "lead" | "compact" | "feature";
};

export const BENTO_CARDS: BentoCard[] = [
  {
    id: "lead",
    variant: "lead",
    title: "Win the customers AI sends your way",
    body: "See who’s asking AI for businesses like yours—and make sure the answer is you, not the shop down the street.",
    cta: "Check my score free",
  },
  {
    id: "reputation",
    variant: "compact",
    title: "Know what AI says about you",
    body: "Spot negative or vague mentions before they cost you bookings.",
  },
  {
    id: "optimize",
    variant: "feature",
    title: "Simple fixes that stick",
    body: "Clear steps to update your website and listings so ChatGPT, Gemini, and others recommend you with confidence.",
  },
  {
    id: "competitive",
    variant: "lead",
    title: "See where competitors beat you",
    body: "Compare who AI recommends for “best near me” searches—and close the gap with an actionable plan.",
  },
];

export const LANDING_STATS = [
  {
    value: "582,000+",
    label: "Businesses checked",
    sub: "Owners who wanted to know if AI was sending customers their way",
  },
  {
    value: "34",
    label: "Typical first score",
    sub: "Out of 100—most businesses have room to grow before AI recommends them consistently",
    suffix: "/100",
  },
  {
    value: "89%",
    label: "Improvement after fixes",
    sub: "Average lift in AI mentions once owners follow our checklist",
    suffix: "+",
  },
] as const;
