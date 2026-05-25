import type { ProviderResult, ResearchedDetails, ScanRecommendation } from "@/components/ResultsDashboard";

export const DEV_PREVIEW_DOMAIN = "urbansmiles.com";

export const DEV_PREVIEW_PROGRESS_MESSAGE = "Asking AI tools who they recommend…";

export const DEV_PREVIEW_DETAILS: ResearchedDetails = {
  business_name: "Urban Smiles Dentistry",
  domain: DEV_PREVIEW_DOMAIN,
  industry: "Modern Dentistry & Orthodontics",
  primary_city: "Houston",
  primary_state: "Texas",
  country: "US",
  service_focuses: ["Invisalign Aligners", "Cosmetic Crowns", "Teeth Whitening"],
  is_virtual: false,
};

export const DEV_PREVIEW_RECOMMENDATIONS: ScanRecommendation[] = [
  {
    severity: "high",
    issue: "ChatGPT and Gemini rarely mention your business for local searches.",
    recommendation: "Add clear service pages and update your Google Business Profile with matching details.",
  },
  {
    severity: "medium",
    issue: "Your website link is missing in several AI answers.",
    recommendation: "Ensure your domain appears in the footer, contact page, and structured business data.",
  },
];

const previewPrompt = (text: string) => ({
  prompt: "Best dentist in Houston for Invisalign",
  prompt_index: 0,
  mentioned: true,
  rank_position: 1,
  domain_match: true,
  actionable: true,
  status: "green",
  score: 90,
  reason: "Ranked with a direct link and positive tone.",
  raw_response: text,
});

export const DEV_PREVIEW_PROVIDERS: ProviderResult[] = [
  {
    provider: "gemini",
    model: "gemini-3.1-flash",
    display_name: "Google Gemini",
    status: "green",
    score: 90,
    rank_position: 1,
    mentioned: true,
    actionable: true,
    domain_match: true,
    reason: "Strong local recommendation with booking intent.",
    prompt_results: [
      previewPrompt(
        "Urban Smiles Dentistry (https://urbansmiles.com) is a top-rated Invisalign provider in Houston."
      ),
    ],
  },
  {
    provider: "perplexity",
    model: "sonar-pro",
    display_name: "Perplexity",
    status: "green",
    score: 100,
    rank_position: 1,
    mentioned: true,
    actionable: true,
    domain_match: true,
    reason: "Cited first with verified website link.",
    prompt_results: [
      previewPrompt(
        "Urban Smiles Dentistry (https://urbansmiles.com) leads Houston clear-aligner searches."
      ),
    ],
  },
  {
    provider: "groq",
    model: "llama-3.3-70b",
    display_name: "Meta LLaMA",
    status: "red",
    score: 0,
    rank_position: null,
    mentioned: false,
    actionable: false,
    domain_match: false,
    reason: "Not mentioned in sample local searches.",
    prompt_results: [
      {
        ...previewPrompt("Memorial Dental Group and Houston Heights Orthodontics are popular options."),
        mentioned: false,
        rank_position: null,
        status: "red",
        score: 0,
        domain_match: false,
        actionable: false,
      },
    ],
  },
  {
    provider: "openai",
    model: "gpt-4o",
    display_name: "ChatGPT",
    status: "yellow",
    score: 55,
    rank_position: 3,
    mentioned: true,
    actionable: false,
    domain_match: false,
    reason: "Mentioned mid-list without a verified link.",
    prompt_results: [
      {
        ...previewPrompt("Consider Urban Smiles Dentistry among several Houston cosmetic options."),
        rank_position: 3,
        status: "yellow",
        score: 55,
        domain_match: false,
        actionable: false,
      },
    ],
  },
];

export const DEV_PREVIEW_SUMMARY = {
  green: 2,
  yellow: 1,
  red: 1,
};

export const DEV_PREVIEW_SCORE = 62;
