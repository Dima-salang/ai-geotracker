export type HowItWorksStep = {
  step: string;
  title: string;
  tagline: string;
  description: string;
  highlight: string;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: "1",
    title: "We find your business",
    tagline: "Your name, location, and services—confirmed.",
    description:
      "Enter your website. We look up your storefront, service area, and what you offer so the test reflects your real market.",
    highlight: "Houston · Invisalign · Cosmetic dentistry",
  },
  {
    step: "2",
    title: "We use real customer questions",
    tagline: "The phrases locals actually type into AI.",
    description:
      "We build searches like “best clear aligners near me” or “who does cosmetic dental work in Houston”—matched to your category and neighborhood.",
    highlight: "3 local search phrases ready",
  },
  {
    step: "3",
    title: "We ask the major AI tools",
    tagline: "ChatGPT, Gemini, Claude, Perplexity—and more.",
    description:
      "Each platform gets the same questions. You see who gets recommended, who gets ignored, and who sends customers to competitors.",
    highlight: "4 platforms checked in parallel",
  },
  {
    step: "4",
    title: "You get your score and next steps",
    tagline: "One number. One clear to-do list.",
    description:
      "A 0–100 visibility score plus plain-language fixes—update your site, listings, and content so AI starts naming your business first.",
    highlight: "Score 68 · 3 quick wins listed",
  },
];
