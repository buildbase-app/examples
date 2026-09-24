// Changed for the BuildBase example: src/middleware.ts checks every /api
// request (a BuildBase session with the right role, or the API token), so the
// per-endpoint token check is gone.
import { CustomerService } from "@/lib/services/customer";

export async function GET({ locals, params, request }) {
  const { id } = params;
  const { DB } = locals.runtime.env;


  const customerService = new CustomerService(DB);
  const customer = await customerService.getById(id);

  if (!customer) {
    return Response.json({ message: "Customer not found" }, { status: 404 });
  }

  return Response.json({ customer: customer });
}
