// Added for the BuildBase example: pay-per-message credits.
import "server-only";

import { bb } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";

/** What one user message costs. Change it to price by model or length. */
export const CREDITS_PER_MESSAGE = 1;

/**
 * Spend the credits for one user message from the workspace's balance.
 * Returns a 402 response when the workspace is out of credits, or null when
 * the charge went through.
 *
 * The message ID is the idempotency key, so a retried request for the same
 * message is not charged twice.
 */
export async function spendCredits(
  workspaceId: string,
  messageId: string
): Promise<Response | null> {
  try {
    await bb().credits.consume(workspaceId, {
      amount: CREDITS_PER_MESSAGE,
      description: "Chat message",
      idempotencyKey: messageId,
    });
    return null;
  } catch (error) {
    if ((error as { code?: string }).code === "INSUFFICIENT_CREDITS") {
      return new ChatbotError("payment_required:chat").toResponse();
    }
    throw error;
  }
}
