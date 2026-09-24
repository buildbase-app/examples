// Changed for the BuildBase example: src/middleware.ts checks every /api
// request (a BuildBase session with the right role, or the API token), so the
// per-endpoint token check is gone.
import { CustomerSubscriptionService } from "@/lib/services/customer_subscription";

export async function GET({ locals, params, request }) {
  const { DB } = locals.runtime.env;


  const customerSubscriptionService = new CustomerSubscriptionService(DB);
  const customerSubscriptions = await customerSubscriptionService.getAll();

  if (customerSubscriptions.length) {
    return Response.json({
      customer_subscriptions: customerSubscriptions,
    });
  } else {
    return Response.json(
      { message: "Couldn't load customer subscriptions" },
      { status: 500 },
    );
  }
}

export async function POST({ locals, request }) {
  const { DB } = locals.runtime.env;


  const body = await request.json();
  const customerSubscriptionService = new CustomerSubscriptionService(DB);

  const response = await customerSubscriptionService.create(body);

  if (response.success) {
    return Response.json(
      { message: "Customer subscription created successfully", success: true },
      { status: 201 },
    );
  } else {
    return Response.json(
      { message: "Couldn't create customer subscription", success: false },
      { status: 500 },
    );
  }
}
