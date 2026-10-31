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

## First run: download, open the folder, check the verifier

You can try this example without a Cloudflare or Creem account. You need **Node.js 22 or later** on your computer. If `node --version` is unavailable or reports an older major version, install a supported release from the [official Node.js download page](https://nodejs.org/en/download), then open a new terminal.

Choose **one** way to get the complete example. Do not copy just `worker.js`: the checks also need `test.mjs` and `package.json`.

### Option A: download a ZIP, without Git

1. [Download the v1.0.0 source ZIP](https://github.com/yibao5056/creem-webhook-verify-worker/archive/refs/tags/v1.0.0.zip). This is the source archive linked under Assets on the [v1.0.0 release](https://github.com/yibao5056/creem-webhook-verify-worker/releases/tag/v1.0.0), with no signup or payment.
2. Extract the ZIP. Open a terminal in the directory **containing** the extracted `creem-webhook-verify-worker-1.0.0` folder, then run:

   ```sh
   cd creem-webhook-verify-worker-1.0.0
   node --version
   node --no-warnings test.mjs
   ```

   If your extractor gave the folder a different name, use that name after `cd`. Run the Node command from **inside** the folder containing `worker.js`, `test.mjs` and `package.json`, not from the ZIP file or its parent directory.

### Option B: clone the same version with Git

From a directory where `creem-verifier-example` does not already exist:

```sh
git clone --depth 1 --branch v1.0.0 https://github.com/yibao5056/creem-webhook-verify-worker.git creem-verifier-example
cd creem-verifier-example
node --version
node --no-warnings test.mjs
```

A Git "detached HEAD" notice is expected when checking out this tag; it does not prevent running the example. If the destination already exists, use a different new directory name in both commands, or open your existing copy deliberately.

Both options select **v1.0.0**, currently commit `f248ddc847d1b53c624ca6a5b49943437911058c`. The [commit ZIP](https://github.com/yibao5056/creem-webhook-verify-worker/archive/f248ddc847d1b53c624ca6a5b49943437911058c.zip) linked on tinytank.app contains the same files, but its extracted folder ends with that full commit ID instead of `1.0.0`; enter that folder before running the Node commands. GitHub archives do not include Git history. This current getting-started page is newer than the README inside that preserved release; the verifier and checks are unchanged.

### What success means

The command prints individual `PASS` lines, ending with:

```text
49 checks passed (offline logic).
```

Once the source and Node are on your computer, this check needs **no `npm install`, network connection, credentials or local server**. Downloading the files and installing Node require network access. The checks use synthetic bodies and a public test placeholder, never real credentials. They cover valid/tampered signatures, uppercase hex, BOM and invalid UTF-8, malformed shapes, exact/over-size bodies, chunked reads, read failure, cancellation failure, configuration failure, method and route.

This verifies JavaScript logic only. The synthetic "paid checkout" case is not a purchase: no Cloudflare endpoint is deployed, and no order or email is created. You can stop here after your first successful run; the local runtime and account setup below are optional next steps.

After trying the checks, you can [share your first-run result](#report-your-first-run-result-public).

### If the first run fails

| What you see | What to check |
| --- | --- |
| `node` is not found, or the major version is below 22 | Install Node from the official link above, reopen the terminal, and run `node --version` again. |
| Node cannot find `test.mjs` | You are usually in the parent or a different directory. Enter the extracted example folder containing that file. |
| A missing `worker.js` or module-format error | Extract the complete archive, including `package.json`; do not run an isolated copied file. Check the Node version too. |
| Git says the clone destination already exists | Choose another new folder name, or enter and inspect the existing copy. The ZIP option needs no Git. |
| A check fails or there is no final success line | Keep it as a failed run. Note your Node version, the source version and the failing check; contact [support@tinytank.app](mailto:support@tinytank.app) with those details. Do not send secrets, signatures, customer data or real webhook bodies. |

## Report your first-run result (public)

Did the offline checks complete, or did one step stop you? A specific result helps me fix the right thing. This is optional; downloading and running the example still need no GitHub account.

**Public on GitHub · GitHub sign-in required.** Opening the link does not submit a report. Review your text before choosing GitHub's submit action.

[Report a first-run result on GitHub](https://github.com/yibao5056/creem-webhook-verify-worker/issues/new?title=%5BFirst+run%5D+v1.0.0%3A+add+your+result&body=Example+version+%2F+commit%3A+v1.0.0+%28change+if+different%29%0ANode+version+%28node+--version%29%3A%0AOS%3A%0AResult+%28completed+%2F+stuck%29%3A%0AStep+or+command%3A%0AExpected%3A%0AActual+%28short%2C+redacted+error+only%29%3A%0A%0AThis+is+a+public+report.+Do+not+include+secrets%2C+signatures%2C+headers%2C+webhook+bodies%2C+order+or+customer+information%2C+or+private+logs.)

The draft has these fields:

- Example version or commit: prefilled with `v1.0.0`; change it if you used another version.
- Node version: the output of `node --version`.
- Operating system.
- Result: `completed` or `stuck`.
- Step or command, expected result, and actual result. For a failure, include only a short, redacted error.

Do not include secrets, signatures, request headers, webhook bodies, orders, customer information or private logs. Once you submit, save the issue URL to follow replies. A report exists only after GitHub shows that URL.

If the link stops at sign-in, sign in to GitHub normally. If it cannot open, visit the repository's [Issues page](https://github.com/yibao5056/creem-webhook-verify-worker/issues), choose **New issue**, and use the fields above. English or Chinese reports are welcome.

This public route is for the free verifier. For private purchase or account support, use [support@tinytank.app](mailto:support@tinytank.app).

## Try the local Workers runtime

Run these commands from the same example folder, after the offline check above. This optional step uses Node 22+ and npm, needs network access to install Wrangler, and starts a local server. It needs no platform login or real signing secret. The pinned CLI below is also used by CI. Earlier instructions used Wrangler 4.143.0, whose bundled runtime cannot start this example's 2026-10-19 compatibility date:

```sh
npx wrangler@4.151.3 dev --var CREEM_WEBHOOK_SECRET:public-test-placeholder
# In another terminal, from the same directory:
bash test.sh
```

`test.sh` runs the same HTTP-capable cases against `http://127.0.0.1:8787`, with ten-second request timeouts.
It uses only the fixed public placeholder; it does not read any signing secret from your shell.
HTTP mode omits the misleading Content-Length, configuration-injection and stream-fault cases that require direct handler access.
For another loopback port: `bash test.sh http://127.0.0.1:8788`. Non-loopback URLs are rejected.
Press **Ctrl+C** in the server terminal when finished. Stop the local server before using real endpoint secrets. Never register the public placeholder as a real webhook secret.

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
