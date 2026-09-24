// Changed for the BuildBase example: src/middleware.ts checks every /api
// request (a BuildBase session with the right role, or the API token), so the
// per-endpoint token check is gone.
import { SubscriptionService } from "@/lib/services/subscription";

export async function GET({ locals, params, request }) {
  const { id } = params;
  const { DB } = locals.runtime.env;


  const subscriptionService = new SubscriptionService(DB);

  try {
    const subscription = await subscriptionService.getById(id);

    if (!subscription) {
      return Response.json(
        { message: "Subscription not found" },
        { status: 404 },
      );
    }

    return Response.json({ subscription });
  } catch (error) {
    return Response.json(
      { message: "Couldn't load subscription" },
      { status: 500 },
    );
  }
}
