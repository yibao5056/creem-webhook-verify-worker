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

### Already downloaded or cloned this complete example?

**Start here. You do not need to download it again.** Extract your ZIP if needed, then open a terminal **inside the folder containing `worker.js`, `test.mjs` and `package.json`**. The folder name can vary with the archive or your extraction tool. Run:

```sh
node --version
node --no-warnings test.mjs
```

Keep all nine example files, including this README. After the final `49 checks passed (offline logic).` line, continue with [what success means](#what-success-means), [first-run troubleshooting](#if-the-first-run-fails), the [optional test endpoint setup](#configure-your-own-test-endpoint-first), or [reporting your result](#report-your-first-run-result-public). The account and feedback instructions below travel with the example; you can read this file locally. Following external documentation or submitting a report still requires network access, and account setup needs your own accounts.

### Need the complete example first?

Get the **[complete current repository ZIP](https://github.com/yibao5056/creem-webhook-verify-worker/archive/refs/heads/main.zip)**, then extract it and follow “Already downloaded” above. This includes the repository's maintained English README, including first-run and account setup instructions. The `main` branch can advance; this link is not a fixed revision.

For a fixed revision, the **[website download page](https://tinytank.app/products/creem-delivery-worker-starter/sample#first-run)** names the commit and extracted folder it currently offers. Its default may still be the preserved code-release archive while the documented download is being prepared. Check the named revision and README before choosing it; publication of this README alone does not mean the website has switched. The Chinese page supplies Chinese download and run instructions; the bundled README is in English.

The verifier's **code version remains v1.0.0**, at code commit `f248ddc847d1b53c624ca6a5b49943437911058c`. A later documentation snapshot changes only this README; it is not a new verifier feature release. Check the exact documentation commit on the download page, and keep it with any result you report. A documentation commit's archive has a different folder name from the preserved release below.

### Reproduce the preserved v1.0.0 release (optional)

The two options below intentionally fetch the **older preserved release**, whose README predates this first-run guide. Choose one only if you want that historical snapshot. They are not required after downloading the current documented source. Do not copy just `worker.js`: the checks also need `test.mjs` and `package.json`.

#### Option A: download a ZIP, without Git

1. [Download the v1.0.0 source ZIP](https://github.com/yibao5056/creem-webhook-verify-worker/archive/refs/tags/v1.0.0.zip). This is the source archive linked under Assets on the [v1.0.0 release](https://github.com/yibao5056/creem-webhook-verify-worker/releases/tag/v1.0.0), with no signup or payment.
2. Extract the ZIP. Open a terminal in the directory **containing** the extracted `creem-webhook-verify-worker-1.0.0` folder, then run:

   ```sh
   cd creem-webhook-verify-worker-1.0.0
   node --version
   node --no-warnings test.mjs
   ```

   If your extractor gave the folder a different name, use that name after `cd`. Run the Node command from **inside** the folder containing `worker.js`, `test.mjs` and `package.json`, not from the ZIP file or its parent directory.

#### Option B: clone the same version with Git

From a directory where `creem-verifier-example` does not already exist:

```sh
git clone --depth 1 --branch v1.0.0 https://github.com/yibao5056/creem-webhook-verify-worker.git creem-verifier-example
cd creem-verifier-example
node --version
node --no-warnings test.mjs
```

A Git "detached HEAD" notice is expected when checking out this tag; it does not prevent running the example. If the destination already exists, use a different new directory name in both commands, or open your existing copy deliberately.

Both historical options select **v1.0.0**, commit `f248ddc847d1b53c624ca6a5b49943437911058c`. The [preserved code-commit ZIP](https://github.com/yibao5056/creem-webhook-verify-worker/archive/f248ddc847d1b53c624ca6a5b49943437911058c.zip) contains the same historical files, but its extracted folder ends with that full commit ID instead of `1.0.0`; enter that folder before running the Node commands. GitHub archives do not include Git history. The code, configuration and checks in the current documented source are identical to that preserved release; only its README is newer.

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

This optional step needs **your own Cloudflare account, Creem account and endpoint signing secret**. The offline first run above needs none of them. Work from the extracted example directory, with Node/npm and network access for the public Wrangler CLI pinned to `4.151.3`.

The downloaded `wrangler.json` enables Cloudflare request logs and traces. The handler's no-logging statement does not disable platform observability; manage access permissions and retention for your deployment. See [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).

### 1. Authenticate the intended Cloudflare account

On your own computer with a browser:

```sh
npx wrangler@4.151.3 login
npx wrangler@4.151.3 whoami
```

Complete Cloudflare authorization in your browser. If the browser does not open, use the authorization URL shown in your own terminal. Wait for login to finish, then run `whoami` and check the intended account. A URL alone is not success: stop on an authentication error or wrong account. If multiple accounts are available, confirm the deployment target.

Do not share credentials, authorization URLs or full account output. A headless server or CI needs a protected token flow instead; see [Cloudflare authentication](https://developers.cloudflare.com/workers/wrangler/commands/general/#login).

### 2. Register and configure the test endpoint

1. In `wrangler.json`, change `env.test.name` and `env.live.name` to two different Worker names unique to your account. Keep explicit `--env` flags; omitting one can target the default Worker.
2. Deploy only the test Worker:

   ```sh
   npx wrangler@4.151.3 deploy --env test
   ```

   A POST to `/webhooks/creem` returns 503 until its signing secret is configured. Opening the URL in a browser sends a GET, not a signed webhook test.

3. In Creem **Test Mode**, use the Developers webhook area to register the deployed test Worker's **HTTPS URL plus `/webhooks/creem`**, selecting `checkout.completed`. Take that test endpoint's own signing secret, then enter it at the interactive prompt:

   ```sh
   npx wrangler@4.151.3 secret put CREEM_WEBHOOK_SECRET --env test
   ```

   This is the **webhook signing secret, not a Creem API key**. Do not put its value in arguments, source, Git, screenshots or messages. Do not use the public test placeholder as an endpoint secret. Keep `.dev.vars`/`.env` files ignored, and stop any placeholder-based local server before using endpoint credentials. `secret put` immediately updates the deployed Worker.

### 3. Check one test checkout and the same order's event

1. Keep Creem **Test Mode** on. In Products, select your own one-time test product, or create one with your own test name, description and price. Do not use a live product or an earlier tinytank.app purchase link.
2. Choose the product's **Share** action and open its payment link. Confirm the checkout's test-mode indicator, product and amount. Stop if any of these is unclear.
3. Use a test email address you can read and synthetic billing details. The [official successful-payment test card](https://docs.creem.io/getting-started/test-mode#testing-payments), checked November 3, 2026, is `4111 1111 1111 1111`, with a future expiry and any test CVV. Use it only on a clearly identified test checkout; do not enter a real card.
4. Submit one simulated payment, then find that product's paid test order in the test dashboard. Keep its order identifier privately. A success-page redirect alone is insufficient. If a timeout, challenge or uncertain result occurs, inspect the existing record before considering another attempt.
5. In the configured **test webhook's delivery records**, find `checkout.completed` for the **same order**. Match `event.object.order.id` to that test order's identifier; checkout, product and event IDs are different fields. Confirm the destination was the test Worker's `/webhooks/creem` and the response was **`200 ok`**. If the order cannot be matched or the response body cannot be verified, leave this check unverified.

`503` means the configured signing secret is absent, not a string or only whitespace. An incorrect nonempty secret normally leads to `401`; check this endpoint's secret and the original request bytes. `ignored`, an unrelated event or a generic 200 status does not verify this order's paid-checkout branch. This example **does not send email, store an order or grant a download**. Do not send its synthetic test traffic to an endpoint connected to real fulfillment.

Sources: [Creem product and Share payment links](https://docs.creem.io/getting-started/quickstart#no-code-solution), [Test Mode](https://docs.creem.io/getting-started/test-mode) and [webhook registration and signatures](https://docs.creem.io/code/webhooks). The guide and historical CI have not run an account checkout or delivery test for you.

### 4. Add fulfillment safeguards before going live

First implement and test durable order storage, duplicate/replay handling, expected product, amount, currency and account validation, access granting and delivery. Do not put an email/download action directly in this verifier's current `ok` branch.

Only after those safeguards work, deploy the separate live Worker. In Creem **Live Mode**, register its different HTTPS endpoint and configure that live endpoint's **different signing secret**:

```sh
npx wrangler@4.151.3 deploy --env live
npx wrangler@4.151.3 secret put CREEM_WEBHOOK_SECRET --env live
```

Keep Worker name, URL, Creem mode and signing secret aligned; changing only the product does not switch the endpoint or secret. Any database, storage or mail service you add needs explicit test isolation and its own complete acceptance. See [Cloudflare environments](https://developers.cloudflare.com/workers/wrangler/environments/) and [secret deployment behavior](https://developers.cloudflare.com/workers/configuration/secrets/). An `ok` still means receipt only, never fulfillment.

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
