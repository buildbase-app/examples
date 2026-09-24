"use client";

// Added for the BuildBase example: sign-in, the credit balance, and the
// credit store, in the header.
import {
  BBAction,
  BBStatus,
  readBBParams,
  useCreditBalanceContext,
  useSaaSAuth,
} from "@buildbase/sdk/react";
import { useEffect, useState } from "react";

/** True on the page load that returns from a successful credit purchase. */
function returnedFromPurchase(): boolean {
  if (typeof window === "undefined") return false;
  const bb = readBBParams();
  return (
    bb?.action === BBAction.CreditPurchase && bb?.status === BBStatus.Success
  );
}

export default function Account() {
  const { isAuthenticated, isLoading, signIn, signOut, openCreditStore } =
    useSaaSAuth();
  // The provider's shared balance for the current workspace. Unlike
  // useCreditBalance(), it refreshes when anything calls
  // invalidateCreditBalance(), as the dream page does after each generation.
  const { balance, refetch } = useCreditBalanceContext();

  // Two moments where the first read can come too early: a new user's
  // starting credits come from a workflow that runs just after their
  // workspace is created, and purchased credits arrive with Stripe's webhook,
  // which can land after the page has loaded. In both cases the total granted
  // is about to rise, so check again for a few seconds until it does. The
  // purchase flag is read during the first render, before the provider
  // removes the `bb` parameter from the URL.
  const [boughtCredits] = useState(returnedFromPurchase);
  const [grantedAtLoad, setGrantedAtLoad] = useState<number | null>(null);
  useEffect(() => {
    if (balance && grantedAtLoad === null) setGrantedAtLoad(balance.totalGranted);
  }, [balance, grantedAtLoad]);
  const awaitingGrant =
    balance != null &&
    (balance.totalGranted === 0 ||
      (boughtCredits && balance.totalGranted === grantedAtLoad));
  useEffect(() => {
    if (!awaitingGrant) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      refetch();
      if (tries >= 10) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [awaitingGrant, refetch]);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        disabled={isLoading}
        onClick={() => signIn()}
        className="rounded-full border border-gray-500 px-5 py-2 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => openCreditStore()}
        data-testid="credit-balance"
        className="rounded-full border border-gray-500 px-4 py-2 text-sm hover:bg-gray-800 transition"
        title="Buy more credits"
      >
        {balance
          ? `${balance.available} ${balance.available === 1 ? "credit" : "credits"}`
          : "Credits"}
      </button>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-full px-3 py-2 text-sm text-gray-400 hover:text-white transition"
      >
        Sign out
      </button>
    </div>
  );
}
