// Added for the BuildBase example: pay-per-generation credits.
import { bb } from "./buildbase";

/** What one generated room costs. */
export const CREDITS_PER_GENERATION = 1;

/** True when the workspace can pay for one more generation. */
export async function canAfford(workspaceId: string): Promise<boolean> {
  const balance = await bb().credits.getBalance(workspaceId);
  return balance.available >= CREDITS_PER_GENERATION;
}

/**
 * Charges one generation. The prediction ID is the idempotency key, so a
 * retried request for the same image is never charged twice. Returns false
 * when the balance ran out in the meantime.
 */
export async function charge(
  workspaceId: string,
  predictionId: string
): Promise<boolean> {
  try {
    await bb().credits.consume(workspaceId, {
      amount: CREDITS_PER_GENERATION,
      description: "Room generation",
      idempotencyKey: predictionId,
    });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "INSUFFICIENT_CREDITS") {
      return false;
    }
    throw error;
  }
}
