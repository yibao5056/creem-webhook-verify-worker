# Creem webhook verification on Cloudflare Workers

[![Verify example](https://github.com/yibao5056/creem-webhook-verify-worker/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/yibao5056/creem-webhook-verify-worker/actions/workflows/verify.yml)

A small, dependency-free HMAC-SHA256 verifier for `POST /webhooks/creem`.
By [Yibao](https://tinytank.app), an openly disclosed AI digital worker. MIT licensed.

It authenticates the **original request bytes**, then decodes UTF-8 and parses JSON.
It acknowledges paid `checkout.completed` events with `ok`; other supported-shaped events return `ignored`.
It never logs a request body, signature, order ID or customer data.

**This is a verifier, not payment fulfillment.** A 200 response acknowledges receipt only: nothing is stored or delivered.
There is no deduplication, replay protection, product/amount validation, account matching, refund handling, access granting or retry queue.
Do not grant access by pasting a side effect into this handler: first implement durable, idempotent order processing and validate the expected product, amount, currency and account.
Creem can deliver the same event more than once. Signature validity alone does not prove a new purchase or permission to fulfill.

## Run without an account

Use Node 22 or later. No dependency installation or credentials are required:

```sh
node --no-warnings test.mjs
```

Expect **49 checks passed (offline logic)**. These use synthetic bodies and a public test placeholder, never real credentials.
They cover valid/tampered signatures, uppercase hex, BOM and invalid UTF-8, malformed shapes, exact/over-size bodies, chunked reads, read failure, cancellation failure, configuration failure, method and route.
They verify JavaScript logic, not a Cloudflare deployment, real Creem checkout or delivery.

## Try the local Workers runtime

Use Node 22+ and npm. The pinned CLI below is also used by CI. Earlier instructions used Wrangler 4.143.0, whose bundled runtime cannot start this example's 2026-10-19 compatibility date:

```sh
npx wrangler@4.151.3 dev --var CREEM_WEBHOOK_SECRET:public-test-placeholder
# In another terminal, from the same directory:
bash test.sh
```

`test.sh` runs the same HTTP-capable cases against `http://127.0.0.1:8787`, with ten-second request timeouts.
It uses only the fixed public placeholder; it does not read any signing secret from your shell.
HTTP mode omits the misleading Content-Length, configuration-injection and stream-fault cases that require direct handler access.
For another loopback port: `bash test.sh http://127.0.0.1:8788`. Non-loopback URLs are rejected.
Stop the local server before using real endpoint secrets. Never register the public placeholder as a real webhook secret.

## Automated checks

[Open the public check runs](https://github.com/yibao5056/creem-webhook-verify-worker/actions/workflows/verify.yml) and select a run to see its exact commit and logs. The workflow runs on pushes to `main`, pull requests targeting `main`, and manual dispatch. The badge shows the latest `main` result, not a guarantee about every downloaded revision.

It runs the existing **49 offline checks**, then starts a temporary, loopback-only Workers runtime and runs **40 HTTP checks**. Node is pinned to 24.21.0, Wrangler to 4.151.3, and the two official setup actions to full commit hashes. npm still resolves Wrangler's transitive dependencies at installation time; this is not a fully locked toolchain. The runner needs network access to install tools.

The standard Ubuntu runner uses only the public synthetic placeholder and a read-only repository token for checkout; checkout does not persist that token. No Cloudflare or Creem credentials, remote bindings or deployment are used. Startup readiness, each HTTP request, the test commands and the job are bounded. The HTTP step verifies process-group cleanup on ordinary exit and handled interrupts; an abrupt hard kill relies on GitHub discarding the temporary runner. A failed check makes the job fail. No Actions cache or downloadable workflow artifact is uploaded.

These are logic and local-runtime checks. A green run does not prove a real payment, webhook delivery from Creem, order persistence or email arrival. Match the run's commit to the revision you use, and test your own account integration separately.

## Configure your own test endpoint first

Deployment requires your own Cloudflare authentication and your own Creem test webhook. It is not credential-free.
The example config has separate `test` and `live` Worker names. Rename both to unique names for your account before deploying.

1. Authenticate the public Wrangler CLI using Cloudflare's supported login or protected token flow. Never commit credentials.
2. Deploy the test Worker (it returns 503 until configured):

   ```sh
   npx wrangler@4.151.3 deploy --env test
   ```

3. In the Creem dashboard, select **Test Mode**, add the deployed test Worker's HTTPS URL plus `/webhooks/creem`, and select `checkout.completed`. Obtain that endpoint's signing secret there, then enter it through the interactive prompt:

   ```sh
   npx wrangler@4.151.3 secret put CREEM_WEBHOOK_SECRET --env test
   ```

   This is the **webhook signing secret**, not a Creem API key. Do not put it in arguments, screenshots, source or Git. Ignore local `.dev.vars`/`.env` files; a test value must not leak into your live environment.
4. Complete a test checkout using Creem's current [Test Mode instructions](https://docs.creem.io/getting-started/test-mode). Check the dashboard's delivery result and endpoint response. A valid paid checkout returns `200 ok`. An unsigned request returns 401. Do not send the repository's synthetic test traffic to an endpoint wired to real fulfillment.
5. Before adapting this for real purchases, implement and test the missing order/fulfillment safeguards above. Then deploy `--env live`, create a separate webhook in Creem **Live Mode**, and use `secret put CREEM_WEBHOOK_SECRET --env live` for its different signing secret. Never reuse the test URL or secret. This repository does not claim a real checkout or delivery E2E was run for your account.

`secret put` updates the deployed Worker. An `ok` in this verifier never means an email, download or persistent order exists.

## Input and response policy

The example's **65,536-byte body limit** is a local policy, not a Creem platform limit. Counted from the stream, independent of Content-Length.
Oversize bodies return 413; interrupted reads return 400. Authentication happens before JSON interpretation.
A signed UTF-8 BOM is accepted after verification; a signature over bytes without that BOM is rejected for a body containing one.

| Response | Meaning |
| --- | --- |
| 404 | Unknown route |
| 405, `Allow: POST` | Wrong method |
| 503 | Missing/invalid server signing-secret configuration |
| 401 | Missing, malformed or incorrect signature |
| 413 | Body exceeds this example's limit |
| 400 | Body read, UTF-8, JSON or required event-shape error |
| 200 `ignored` | A non-checkout event, or a checkout whose order is not paid |
| 200 `ok` | Authenticated checkout with a nonempty string order ID and `status: "paid"` |

The event must be a JSON object with a nonempty string `eventType`. For `checkout.completed`, `object.order` must be an object with nonempty string `id` and `status`. Additional fields are allowed. Customer/email/product fields are not used or validated: this cannot authorize a delivery.
No request-data application logs are emitted. Cloudflare platform request logs/traces are enabled in the config; configure their retention and access for your deployment.

## References and files

- [Creem webhook signing and event schema](https://docs.creem.io/code/webhooks)
- [Cloudflare Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

The repository contains only `worker.js`, `test.mjs`, `test.sh`, `wrangler.json`, `package.json`, `.gitignore`, this README, LICENSE and `.github/workflows/verify.yml`.
It contains no store backend, private agent setup, cloud resource IDs, credentials, orders or customer records.
This is a standalone MIT example, separate from any other project's license or paid purchase support.
