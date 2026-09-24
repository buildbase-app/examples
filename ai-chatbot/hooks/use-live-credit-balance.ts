"use client";

// Added for the BuildBase example: the workspace's credit balance, re-read
// while credits are known to be on their way.
import {
  BBAction,
  BBStatus,
  readBBParams,
  useCreditBalanceContext,
} from "@buildbase/sdk/react";
import { useEffect, useState } from "react";

/** True on the page load that returns from a successful credit purchase. */
function returnedFromPurchase(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const bb = readBBParams();
  return (
    bb?.action === BBAction.CreditPurchase && bb?.status === BBStatus.Success
  );
}

/**
 * The provider's shared balance for the current workspace. Unlike
 * useCreditBalance(), it refreshes whenever invalidateCreditBalance() is
 * called, as the chat does after each message.
 *
 * Two moments where the first read can come too early: a new user's starting
 * credits come from a workflow that runs just after their workspace is
 * created, and purchased credits arrive with Stripe's webhook, which can land
 * after the page has loaded. In both cases the total granted is about to rise,
 * so this checks again for a few seconds until it does. The purchase flag is
 * read during the first render, before the provider removes the `bb`
 * parameter from the URL.
 */
export function useLiveCreditBalance() {
  const context = useCreditBalanceContext();
  const { balance, refetch } = context;
  const [boughtCredits] = useState(returnedFromPurchase);
  const [grantedAtLoad, setGrantedAtLoad] = useState<number | null>(null);

  useEffect(() => {
    if (balance && grantedAtLoad === null) {
      setGrantedAtLoad(balance.totalGranted);
    }
  }, [balance, grantedAtLoad]);

  const awaitingGrant =
    balance != null &&
    (balance.totalGranted === 0 ||
      (boughtCredits && balance.totalGranted === grantedAtLoad));

  useEffect(() => {
    if (!awaitingGrant) {
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      refetch();
      if (tries >= 10) {
        clearInterval(timer);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [awaitingGrant, refetch]);

  return context;
}
