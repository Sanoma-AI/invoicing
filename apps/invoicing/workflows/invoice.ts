// A helper of the two workflows (no default export, so no workflow): what `sanoma/invoices` reads
// of an invoice record, and the emails that carry it. Pure functions, no `ctx`.
import { type Currency, formatMoney, type InvoiceInput } from "sanoma/invoices";
import type { InvoiceFile } from "sanoma/invoices/pdf";

/** The UTC day of `ms` since the epoch, as a date field holds it: "2026-11-10". */
export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** What these read of a record of `invoicing.invoices` (../resources/data.ts). */
interface Invoice {
  number?: string;
  issuedOn?: string;
  dueOn?: string;
  currency: Currency;
  lines: string;
  notes?: string;
  from: string;
  fromEmail: string;
}

/** What these read of a record of the root's `clients`. */
interface Client {
  name: string;
  email: string;
  address?: string;
}

/**
 * The invoice a PDF is made of: a sent record's number, dates and lines, from its sender, to the
 * client. `renderInvoice` refuses it, naming the field, if the record has no number or issue date.
 */
export function invoiceInput(invoice: Invoice, client: Client): InvoiceInput {
  return {
    number: invoice.number ?? "",
    issuedOn: invoice.issuedOn ?? "",
    ...(invoice.dueOn && { dueOn: invoice.dueOn }),
    issuer: { name: invoice.from, email: invoice.fromEmail },
    recipient: {
      name: client.name,
      email: client.email,
      ...(client.address && { address: { lines: [client.address] } }),
    },
    currency: invoice.currency,
    lines: JSON.parse(invoice.lines),
    ...(invoice.notes && { notes: invoice.notes }),
  };
}

/** The email that sends the invoice (`reminder: false`) or reminds the client of it, the PDF attached. */
export function invoiceEmail(invoice: Invoice, client: Client, file: InvoiceFile, reminder: boolean) {
  const total = formatMoney(file.summary.dueMinor, invoice.currency);
  const due = invoice.dueOn ? `, due on ${invoice.dueOn},` : "";
  const what = `Invoice ${invoice.number} for ${total}${due}`;
  return {
    to: client.email,
    from: `${invoice.from} <${invoice.fromEmail}>`,
    subject: `${reminder ? "Reminder: invoice" : "Invoice"} ${invoice.number} from ${invoice.from}`,
    text: `Hello ${client.name},\n\n${reminder ? `${what} is still unpaid. It is attached again.` : `${what} is attached.`}\n\nThank you,\n${invoice.from}`,
    // btoa, not Node's Buffer: a demo runs the workflow in a browser page.
    attachments: [{ filename: file.filename, content: btoa(Array.from(file.bytes, (b) => String.fromCharCode(b)).join("")) }],
  };
}
