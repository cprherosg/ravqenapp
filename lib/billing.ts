export type LaunchPlan = {
  id: "single_session_pack" | "weekly_limit" | "monthly_unlimited";
  name: string;
  publicLabel: string;
  priceLabel: string;
  summary: string;
  included: string[];
  ctaHref: string;
  ctaLabel: string;
  available: boolean;
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@ravqen.app";

function configuredPaymentLink(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function fallbackSupportHref(planName: string) {
  const subject = encodeURIComponent(`Ravqen ${planName} enquiry`);
  const body = encodeURIComponent(
    `Hi Ravqen,%0D%0A%0D%0AI'd like more details about the ${planName} plan.%0D%0A%0D%0AThanks.`,
  );
  return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
}

export function getSupportEmail() {
  return supportEmail;
}

export function getLaunchPlans(): LaunchPlan[] {
  const sessionPackLink = configuredPaymentLink(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_SESSION_PACK);
  const weeklyLimitLink = configuredPaymentLink(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_WEEKLY_LIMIT);
  const unlimitedLink = configuredPaymentLink(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_UNLIMITED);

  return [
    {
      id: "single_session_pack",
      name: "Session Pack",
      publicLabel: "Flexible access",
      priceLabel: "Pay per block",
      summary: "A simple option for occasional members who want guided structure without a weekly commitment.",
      included: [
        "Guided 60-minute sessions",
        "Session credits that count down only when saved",
        "Best for irregular training weeks",
      ],
      ctaHref: sessionPackLink ?? fallbackSupportHref("Session Pack"),
      ctaLabel: sessionPackLink ? "Buy session pack" : "Contact for pricing",
      available: Boolean(sessionPackLink),
    },
    {
      id: "weekly_limit",
      name: "Weekly Limit",
      publicLabel: "Core rhythm",
      priceLabel: "Most balanced",
      summary: "For members who want a dependable number of guided sessions each week without needing unlimited access.",
      included: [
        "Weekly session allowance",
        "Member dashboard, history, and progression tracking",
        "Ideal for sustainable 2-4 day training weeks",
      ],
      ctaHref: weeklyLimitLink ?? fallbackSupportHref("Weekly Limit"),
      ctaLabel: weeklyLimitLink ? "Choose weekly limit" : "Contact for pricing",
      available: Boolean(weeklyLimitLink),
    },
    {
      id: "monthly_unlimited",
      name: "Unlimited",
      publicLabel: "Full Ravqen access",
      priceLabel: "Best value",
      summary: "For members who want the full Ravqen rotation available every week inside a commercial gym.",
      included: [
        "Unlimited guided sessions",
        "Full access to the rotating program calendar",
        "Best fit for committed members training most weeks",
      ],
      ctaHref: unlimitedLink ?? fallbackSupportHref("Unlimited"),
      ctaLabel: unlimitedLink ? "Start unlimited" : "Contact for pricing",
      available: Boolean(unlimitedLink),
    },
  ];
}
