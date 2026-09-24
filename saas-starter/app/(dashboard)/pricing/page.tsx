'use client';

// Modified from nextjs/saas-starter: plans come from your BuildBase org's
// pricing group instead of Stripe products, and "Get Started" opens a
// BuildBase checkout for the team's workspace. No Stripe code or webhook
// lives in this app. The card design is unchanged.
import { getBasePriceCents, type IPlanVersion } from '@buildbase/sdk';
import {
  usePublicPlans,
  useSaaSAuth,
  useSaaSWorkspaces,
  useCreateCheckoutSession,
} from '@buildbase/sdk/react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/** The pricing group slug set up in the BuildBase console. */
const PRICING_GROUP =
  process.env.NEXT_PUBLIC_BUILDBASE_PRICING_GROUP || 'pricing';

// Marketing copy per plan, as upstream had it. The prices and trial come from
// BuildBase; the feature bullets are yours to write.
const FEATURES: Record<string, string[]> = {
  Base: ['Unlimited Usage', 'Unlimited Workspace Members', 'Email Support'],
  Plus: [
    'Everything in Base, and:',
    'Early Access to New Features',
    '24/7 Support + Slack Access',
  ],
};

export default function PricingPage() {
  const { plans, loading, error } = usePublicPlans(PRICING_GROUP);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {loading ? (
        <p className="text-center text-gray-600">Loading plans...</p>
      ) : error || !plans.length ? (
        <p className="text-center text-gray-600">
          No plans yet. Publish a pricing group named &quot;{PRICING_GROUP}
          &quot; in the BuildBase console.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
          {plans.map((plan) => (
            <PricingCard
              key={plan._id}
              planVersionId={plan._id}
              name={plan.name}
              price={
                getBasePriceCents(
                  plan as unknown as IPlanVersion,
                  'usd',
                  'monthly' as never
                ) ?? 0
              }
              interval="month"
              trialDays={plan.trial?.enabled ? plan.trial.durationDays : 0}
              features={FEATURES[plan.name] ?? []}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function PricingCard({
  planVersionId,
  name,
  price,
  interval,
  trialDays,
  features,
}: {
  planVersionId: string;
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
}) {
  const { isAuthenticated, signIn } = useSaaSAuth();
  const { currentWorkspace } = useSaaSWorkspaces();
  const { createCheckoutSession } = useCreateCheckoutSession(
    currentWorkspace?._id
  );
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function getStarted() {
    if (!isAuthenticated) return signIn('/pricing');
    setPending(true);
    try {
      const origin = window.location.origin;
      const result = await createCheckoutSession({
        planVersionId,
        currency: 'usd',
        successUrl: `${origin}/dashboard`,
        cancelUrl: `${origin}/pricing`,
      });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
      else router.push('/dashboard');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pt-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        {trialDays ? `with ${trialDays} day free trial` : ' '}
      </p>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        ${price / 100}{' '}
        <span className="text-xl font-normal text-gray-600">
          per team / {interval}
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={getStarted}
        disabled={pending || (isAuthenticated && !currentWorkspace)}
        variant="outline"
        className="w-full rounded-full"
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Loading...
          </>
        ) : (
          <>
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
