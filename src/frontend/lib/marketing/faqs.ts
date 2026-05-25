export type FaqItem = {
  question: string;
  answer: string;
};

export const MARKETING_FAQS: FaqItem[] = [
  {
    question: "What is AI visibility—and why isn’t Google enough anymore?",
    answer:
      "When customers ask ChatGPT, Gemini, or Claude who to hire or where to shop, the answer is your new front door. AI visibility means those tools actually recommend your business—with your name, services, and website. Ranking on Google alone doesn’t guarantee you show up in those conversations.",
  },
  {
    question: "How is my visibility score calculated?",
    answer:
      "We run real searches your customers would use in your area, then check four things: how often AI mentions you, whether the tone is positive, whether customers get a clear way to contact or book you, and whether your website link is correct.",
  },
  {
    question: "How do you make sure the check matches my real business?",
    answer:
      "Before we query AI tools, we confirm your business name, location, and services from public web sources. That way we test the same kinds of questions locals actually ask—not generic guesses.",
  },
  {
    question: "Do I need technical setup to run a check?",
    answer:
      "No. Enter your website and we handle the rest on our servers. Create a free account to save reports and run more checks. Teams managing many locations can use our dashboard for bulk monitoring.",
  },
  {
    question: "What do I get after a scan?",
    answer:
      "A simple score from 0–100, a breakdown by AI platform, and a plain-language checklist—what to fix on your site and listings so more customers hear your name first.",
  },
  {
    question: "Can you fix visibility for me?",
    answer:
      "Our Premium plan gives you unlimited checks and step-by-step guidance. Ultra Premium includes hands-on help updating your site and listings. Email sales@iozera.ai to talk through what fits your business.",
  },
];
