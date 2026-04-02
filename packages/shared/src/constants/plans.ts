export const PLANS = {
  starter: {
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      "1 parent profile",
      "AI chat with Kin",
      "Meal planning + grocery lists",
      "Budget tracking",
      "Calendar sync",
    ],
  },
  family: {
    name: "Family",
    monthlyPrice: 49,
    yearlyPrice: 490,
    features: [
      "2 private parent profiles",
      "Shared household layer",
      "Dual calendar + conflict detection",
      "Date night suggestions",
      "Sunday family briefing",
      "Everything in Starter",
    ],
  },
} as const;
