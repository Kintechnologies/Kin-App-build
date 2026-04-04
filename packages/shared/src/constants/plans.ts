// Single Kin Premium plan — $39/mo or $299/yr.
// Maps to subscription_tier = "starter" in the database.
export const PLANS = {
  premium: {
    name: "Kin Premium",
    monthlyPrice: 39,
    annualPrice: 299,
    features: [
      "Morning briefing & coordination alerts",
      "Unlimited Kin AI chat",
      "Smart family calendar sync",
      "Household budget tracking",
      "Weekly meal plans & grocery lists",
      "Partner household sharing",
      "Private & encrypted",
    ],
  },
} as const;
