type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    CUSTOMER_WORKFLOW: Workflow;
    DB: D1Database;
    /** Added for the BuildBase example: the signed-in person, set by the middleware. */
    member: import("./lib/buildbase").Member | null;
  }
}
