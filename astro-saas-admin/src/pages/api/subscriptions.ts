// Changed for the BuildBase example: src/middleware.ts checks every /api
// request (a BuildBase session with the right role, or the API token), so the
// per-endpoint token check is gone.
import { SubscriptionService } from "@/lib/services/subscription";

export async function GET({ locals, params, request }) {
  const { DB } = locals.runtime.env;


  const subscriptionService = new SubscriptionService(DB);

  try {
    const subscriptions = await subscriptionService.getAll();
    return Response.json({ subscriptions });
  } catch (error) {
    return Response.json(
      { message: "Couldn't load subscriptions" },
      { status: 500 },
    );
  }
}

export async function POST({ locals, request }) {
  const { DB } = locals.runtime.env;


  const subscriptionService = new SubscriptionService(DB);

  try {
    const body = await request.json();
    await subscriptionService.create(body);
    return Response.json(
      {
        message: "Subscription created successfully",
        success: true,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        message: error.message || "Failed to create subscription",
        success: false,
      },
      { status: 500 },
    );
  }
}
