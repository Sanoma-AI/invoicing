// The invoicing app's own records: `invoicing.invoices` and `invoicing.sequence`. The clients an
// invoice is for are the company's (`clients`, in the root's resources/data.ts).
import { collection } from "sanoma/data";

/**
 * An invoice, from its draft to its payment. `lines` is the invoice's lines as JSON, each
 * `{ description, quantity, unit, unitPrice, serviceDate? }` as `sanoma/invoices` reads a line,
 * quantities and prices as decimal text.
 */
export const invoices = collection({
  name: "invoices",
  title: "Invoices",
  key: "id",
  fields: {
    id: "text",
    /** `INV-0042`: given when it is sent, unless it has one already. */
    number: { type: "text", optional: true },
    /** The client's name, as `clients` keys it. */
    client: "text",
    /** Overdue is not a status: a sent invoice is overdue once its due date has passed. */
    status: { enum: ["draft", "sent", "paid"] },
    /** The currencies `sanoma/invoices` takes (`currencySchema`): a data file imports only `sanoma/data`, so they are listed here. */
    currency: { enum: ["USD", "EUR", "GBP", "AUD", "CAD", "JPY", "KWD"] },
    lines: "text",
    notes: { type: "text", optional: true },
    /** Who it is from, as the invoice says and the email is sent as. */
    from: "text",
    fromEmail: "text",
    issuedOn: { type: "date", optional: true },
    dueOn: { type: "date", optional: true },
    remindedOn: { type: "date", optional: true },
    paidOn: { type: "date", optional: true },
    /** The run of `invoice-send` that sent it. */
    sendRun: { type: "text", optional: true },
  },
});

/** The app's own bookkeeping: the next invoice number, under the name `invoice`. */
export const sequence = collection({
  name: "sequence",
  title: "Invoice numbers",
  key: "name",
  fields: {
    name: "text",
    next: "number",
  },
});
