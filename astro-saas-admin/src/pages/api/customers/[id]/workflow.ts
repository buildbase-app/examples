// Changed for the BuildBase example: src/middleware.ts checks every /api
// request (a BuildBase session with the right role, or the API token), so the
// per-endpoint token check is gone.

type Params = {
  id: string;
};

export async function POST({
  locals,
  request,
  params,
}: {
  locals: App.Locals;
  request: Request;
  params: Params;
}) {
  const { CUSTOMER_WORKFLOW } = locals.runtime.env;


  const { id } = params;
  await CUSTOMER_WORKFLOW.create({ params: { id } });
  return new Response(null, { status: 202 });
}
