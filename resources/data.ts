// The company's own records, kept in its database. A collection's operations (`data.<name>.get`,
// `.list`, `.save` and `.delete`) are what a workflow names in `uses` and calls on
// `ctx.data.<name>`, under the policy and in the ledger. Workflows import this file
// (`import { outbound } from "../resources/data.ts"`), so it imports only from "sanoma/data" and
// holds only collections.
import { collection } from "sanoma/data";

/** The outbound pipeline: which lead is at which stage, and who owns it. */
export const outbound = collection({
  name: "outbound",
  title: "Outbound",
  // Each record is found by its company: a required text field.
  key: "company",
  fields: {
    company: "text",
    contact: "text",
    stage: { enum: ["researched", "contacted", "replied", "meeting", "won", "lost"] },
    owner: "person",
    lastTouched: { type: "date", optional: true },
  },
});

/** Who the company works for: each found by their name, and the address an invoice goes to. */
export const clients = collection({
  name: "clients",
  title: "Clients",
  key: "name",
  fields: {
    name: "text",
    email: "text",
    phone: { type: "text", optional: true },
    /** Where the client is billed, one line: "14 Elm St, Springfield". */
    address: { type: "text", optional: true },
  },
});

/** The work done for a client: each job is one line of the invoice that bills it. */
export const jobs = collection({
  name: "jobs",
  title: "Jobs",
  key: "id",
  fields: {
    id: "text",
    /** The client's name, as `clients` keys it. */
    client: "text",
    description: "text",
    quantity: "number",
    /** The units `sanoma/invoices` takes (`lineSchema`): a data file imports only `sanoma/data`, so they are listed here. */
    unit: { enum: ["visit", "hour", "night", "job", "item", "charge"] },
    /** The price of one unit, in the invoice's currency. */
    rate: "number",
    doneOn: { type: "date", optional: true },
    /** The invoice that bills it, once one does. */
    invoice: { type: "text", optional: true },
  },
});
