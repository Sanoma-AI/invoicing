# Invoicing

An invoicing app for a company on [Sanoma](https://github.com/Sanoma-AI/sanoma). Draft an invoice for a client, from the jobs done for them or line by line. Send it: it is numbered, emailed with its PDF and marked sent. Seven days later, if it is still unpaid, the client gets a reminder. Everything lives in `apps/invoicing/`. The rest of this repository is a small company it runs in: Dana's Pet Care, an invented business with invented clients.

## What it does

- **Invoices** (`/sites/invoicing/invoicing/invoices`): every invoice, drafts first, each with its standing (Draft, Sent, Overdue once the due date has passed, Paid). Start a draft for a client.
- **An invoice** (`/sites/invoicing/invoicing/invoices/<id>`): a draft's editor (client, currency, from, lines, notes, and the client's jobs not yet on an invoice, to add as lines) beside the invoice as it will read, with Save, Send and Download PDF. Once sent, the run shows step by step: the PDF, the email, the seven days' wait and the reminder. Mark paid and Remind are here too.
- **Invoice tool** (`/sites/invoicing/invoicing/tool`): a stateless page that saves and sends nothing. Type the lines, and the totals and the PDF are made in the browser. Its lines and currency can be preset in the URL: `?lines=<JSON>&currency=EUR`, where `lines` is a URL-encoded JSON list of `{ "description", "quantity", "unit", "unitPrice" }`. Quantity and unit price are decimal text, and the unit is one of `visit`, `hour`, `night`, `job`, `item`, `charge` (1 to 100 lines).

The totals, the tax and the PDF come from `sanoma/invoices` (the PDF through `@react-pdf/renderer`, which this repository depends on).

## Workflows

- `invoicing.invoice-send` (`{ id }`) numbers a draft from `invoicing.sequence` (`INV-0001` onwards) unless it has a number, renders its PDF, emails it to the client through Resend, marks it sent, waits seven days, and reminds the client if it is still unpaid then.
- `invoicing.invoice-remind` (`{ id }`) emails a sent invoice's reminder, with its PDF, now.

`apps/invoicing/policies/invoicing.cedar` holds both for `admin` when someone outside `admin` starts them, and refuses deleting an invoice that has been sent.

## Taking it into your company

Merge it as an app, as your repository's AGENTS.md says (`git fetch https://github.com/Sanoma-AI/invoicing`, then `git merge --allow-unrelated-histories FETCH_HEAD`, keeping only `apps/invoicing/` and both sides of `package.json`). Then:

1. Declare the two collections the app reads from your company in your `resources/data.ts`. Both are named by the client's name, and the app reads them as written here:
   - `clients`: key `name`. Fields: `name` text, `email` text, `phone` text (optional), `address` text (optional, one line).
   - `jobs`: key `id`. Fields: `id` text, `client` text (a client's `name`), `description` text, `quantity` number, `unit` one of `visit | hour | night | job | item | charge`, `rate` number (one unit's price), `doneOn` date (optional), `invoice` text (optional, the id of the invoice that bills it).
2. Add `@react-pdf/renderer` and `@sanoma-ai/connector-resend` to `package.json`, and `resend` to `sanoma.config.ts`'s connectors if it is not there.
3. Give Resend its key on its connector page, and send from an address on a domain verified with Resend: an invoice's `fromEmail` is its sender.
4. The scenarios under `apps/invoicing/scenarios/` name this repository's founder, `dana`, as who is acting and approving. Rename them to a person in your `resources/people.ts`, then run `npm run check`.

The app's own records are `invoicing.invoices` (an invoice from draft to paid; its `lines` are JSON text, each line as `sanoma/invoices` reads one) and `invoicing.sequence` (the next number).

## Run it here

```sh
pnpm install
pnpm dev      # the app on this computer, with its own Postgres
pnpm check    # types, lint, policies, the sites' build and every scenario
```

Sign in as `dana`. Sending emails through Resend needs its key. Without one, the scenarios show the runs against Resend's fake. `scenarios/world.feature` describes the company a demo opens on: four clients, five jobs, and invoices paid, sent, overdue and in draft.

## Licence

Apache-2.0. See `LICENSE`.
