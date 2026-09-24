// Changed for the BuildBase example: src/middleware.ts checks every /api
// request (a BuildBase session with the right role, or the API token), so the
// per-endpoint token check is gone.
import { CustomerService } from "@/lib/services/customer";

export async function GET({ locals, request }) {
  const { DB } = locals.runtime.env;


  const customerService = new CustomerService(DB);
  const customers = await customerService.getAll();

  if (customers) {
    return Response.json({ customers });
  } else {
    return Response.json(
      { message: "Couldn't load customers" },
      { status: 500 },
    );
  }
}

export async function POST({ locals, request }) {
  const { DB } = locals.runtime.env;


  const customerService = new CustomerService(DB);

  const body = await request.json();
  const success = await customerService.create(body);

  if (success) {
    return Response.json(
      { message: "Customer created successfully", success: true },
      { status: 201 },
    );
  } else {
    return Response.json(
      { message: "Couldn't create customer", success: false },
      { status: 500 },
    );
  }
}
