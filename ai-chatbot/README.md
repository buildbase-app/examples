# AI Chatbot with BuildBase

A full-featured AI chatbot where **every message spends credits**. Users sign in with BuildBase, each gets a workspace with a starting credit balance, and when it runs out, the built-in credit store sells them more through Stripe.

This is [Vercel's Chatbot](https://github.com/vercel/chatbot) (21k★), the same app and the same AI SDK, with its authentication and usage limits replaced by [BuildBase](https://buildbase.app). Every other part is unchanged: streaming, tools, artifacts, file uploads and chat history. See [What changed](#what-changed).

| Upstream (vercel/chatbot) | This example |
| --- | --- |
| NextAuth email/password + anonymous guest accounts | BuildBase hosted sign-in: email, Google, GitHub, passkeys, whatever you enable |
| A fixed cap of 10 messages per user per hour | Credits per message, bought by the user |
| No way to charge users | Stripe checkout for credit packs, built in |
| No workspaces | A workspace per user (teams can share one) |

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbuildbase-app%2Fexamples&root-directory=ai-chatbot&project-name=ai-chatbot-buildbase&env=NEXT_PUBLIC_BUILDBASE_ORG_ID,NEXT_PUBLIC_BUILDBASE_CLIENT_ID,BUILDBASE_CLIENT_SECRET,NEXT_PUBLIC_BUILDBASE_REDIRECT_URL&envDescription=Your%20org%20and%20auth%20client%20from%20the%20BuildBase%20console&envLink=https%3A%2F%2Fgithub.com%2Fbuildbase-app%2Fexamples%2Ftree%2Fmain%2Fai-chatbot%23set-up-buildbase)

After deploying, add three storage integrations from the project's **Storage** tab, the same ones the upstream template uses: **Neon** (Postgres, for chats), **Upstash** (Redis, for resumable streams) and **Blob** (file uploads). The AI Gateway authenticates through Vercel automatically.

## Set up BuildBase (15-25 minutes)

**Sign-in**

1. Create an organization at [console.buildbase.app](https://console.buildbase.app) and copy its ID from **Settings → General**.
2. Create an auth client under **User Management → Authentication**. Copy the client ID and the client secret, which is shown only once.
3. Register the redirect URL on that client: `http://localhost:3000/welcome` locally, and `https://<your-domain>/welcome` on Vercel. Wildcards like `*.vercel.app` are not accepted, so add each domain exactly.
4. Enable at least one sign-in method on the same page.

**Credits**

5. Connect Stripe (test keys are fine) under **Billing → Credentials**.
6. Create at least one credit package, for example 100 credits for $5, under **Billing → Credit Packages**. This is what the credit store sells.
7. Give new users a starting balance. Create a workflow triggered by **Workspace Created**, add a **Grant Credits** action (for example 20 credits), and **publish** it. Drafts never run. Without this, new users start at 0 and the first message opens the store.

**Environment**

```bash
cp .env.example .env.local
```

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_BUILDBASE_ORG_ID` | Your org ID |
| `NEXT_PUBLIC_BUILDBASE_CLIENT_ID` | The auth client's ID |
| `BUILDBASE_CLIENT_SECRET` | The auth client's secret. **Server only** |
| `NEXT_PUBLIC_BUILDBASE_REDIRECT_URL` | The exact `/welcome` URL from step 3 |
| `NEXT_PUBLIC_BUILDBASE_SERVER_URL` | Optional. Defaults to `https://api.console.buildbase.app` |
| `AI_GATEWAY_API_KEY`, `POSTGRES_URL`, `REDIS_URL`, `BLOB_READ_WRITE_TOKEN` | Unchanged from upstream. On Vercel, `vercel env pull` fills them |

## Run locally

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. You are sent to `/welcome`, sign in on your org's hosted page, and land in the chat with your starting credits.

## How the credits work

- **`lib/credits.ts`**: `spendCredits()` calls `bb.credits.consume()` for the user's workspace, using the message ID as the idempotency key, so a retried request is never charged twice. On `INSUFFICIENT_CREDITS` it returns a 402.
- **`app/(chat)/api/chat/route.ts`**: spends the credits **before** the model runs, after the ownership checks, so a refused request costs nothing. Tool-approval continuations carry no new message and are free.
- **`hooks/use-active-chat.tsx`**: sends the current workspace with each message. On a 402 it opens the credit store (`openCreditStore()`), and after each reply it refreshes the balance.
- **`components/chat/sidebar-user-nav.tsx`**: shows the balance under your email and has a **Buy credits** item.

To price by model or length, change `CREDITS_PER_MESSAGE`, or compute an amount from the request before calling `spendCredits()`.

## Good to know

- **BuildBase does not run the model.** Streaming, tools and the LLM come from the AI SDK and Vercel's AI Gateway, exactly as upstream. BuildBase handles who the user is, which workspace they are in, and what they have paid for.
- **Credit calls are rate limited** to 30 per minute per IP. Serverless functions can share an outgoing IP, which is fine for a demo; for real traffic, batch or meter server-side against a quota instead.
- **The chat database keeps its own `User` table.** BuildBase owns the account; the row, created on first sign-in by `ensureUser()`, only anchors chats, votes and documents.
- **The upstream Playwright suite was removed.** It drove the guest sign-in flow, which no longer exists.

## What changed

The full list, file by file, is in [NOTICE](NOTICE). In short: the NextAuth credentials and guest flow were replaced by BuildBase sign-in behind the same `auth()` function, so the ten routes that call it did not change. The hourly message cap was replaced by credits.

## License

Apache-2.0, like the upstream it is based on. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Based on [vercel/chatbot](https://github.com/vercel/chatbot) at `c2f8235`.
