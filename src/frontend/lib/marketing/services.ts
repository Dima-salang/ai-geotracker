export type ServiceOffering = {
  title: string;
  subtitle: string;
  description: string;
  details: string[];
  accentClass: string;
};

export const SERVICE_OFFERINGS: ServiceOffering[] = [
  {
    title: "AI visibility check",
    subtitle: "Find out if AI recommends you",
    description:
      "When someone asks ChatGPT or Google’s AI for a business like yours, does your name come up? We run a fast check across the major tools and give you an easy score.",
    details: [
      "Checks ChatGPT, Gemini, Claude, and Perplexity",
      "Simple 0–100 visibility score",
      "Shows which searches mention you—or don’t",
    ],
    accentClass: "bg-primary",
  },
  {
    title: "Competitor comparison",
    subtitle: "See who AI prefers instead",
    description:
      "If customers are being sent to rivals, we show which names appear, on which platforms, and what those businesses are doing differently.",
    details: [
      "Tracks competitor mentions across many searches",
      "Highlights missing local keywords and services",
      "Surfaces quick wins to catch up",
    ],
    accentClass: "bg-amber-400",
  },
  {
    title: "Action plan",
    subtitle: "Know exactly what to change",
    description:
      "No jargon-heavy reports—just a checklist: update your website, fix your listings, and add the details AI needs to recommend you with confidence.",
    details: [
      "Plain-language website updates",
      "Listing and profile improvements",
      "Templates that help AI cite you correctly",
    ],
    accentClass: "bg-primary/80",
  },
];
