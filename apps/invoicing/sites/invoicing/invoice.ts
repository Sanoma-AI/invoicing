// What the tool and the invoice pages share: a line as a form holds it, the arithmetic over the
// lines that are complete, and the PDF, made in the page. Browser code; `sanoma/invoices` is
// computation only, and `sanoma/invoices/pdf` is loaded when a PDF is asked for, since its
// renderer is large.
import { calculateInvoice, type Currency, type InvoiceInput, InvoiceValidationError, lineSchema } from "sanoma/invoices";

export type Line = InvoiceInput["lines"][number];

/** A line as a form holds it: what was typed, and a key of its own for React. */
export interface LineDraft {
  key: number;
  description: string;
  quantity: string;
  unit: Line["unit"];
  unitPrice: string;
}

export const UNITS = lineSchema.shape.unit.options;
/** A list of lines, as the tool's URL search and an invoice record's `lines` hold them. */
export const linesSchema = lineSchema.array().max(200);

let nextKey = 1;

/** Lines as a form holds them, each with a new key. */
export const drafted = (lines: readonly Partial<Line>[]): LineDraft[] =>
  lines.map(({ description = "", quantity = "", unit = "item", unitPrice = "" }) => ({
    key: nextKey++,
    description,
    quantity,
    unit,
    unitPrice,
  }));

/** Whether anything has been typed on a line of a form. */
export const typed = ({ description, quantity, unitPrice }: LineDraft) => Boolean(description || quantity || unitPrice);

/** The lines of a form that make a valid line, as an invoice holds them: the rest are still being typed. */
export const completeLines = (drafts: readonly LineDraft[]): Line[] =>
  drafts.flatMap(({ description, quantity, unit, unitPrice }) => {
    const parsed = lineSchema.safeParse({ description, quantity, unit, unitPrice });
    return parsed.success ? [parsed.data] : [];
  });

/** What an invoice record's `lines` JSON holds: a list, else nothing. */
function recordList(text: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err instanceof SyntaxError) return [];
    throw err;
  }
}

/** An invoice record's lines; none unless every line is one `sanoma/invoices` takes. */
export const recordLines = (text: string): Line[] => linesSchema.safeParse(recordList(text)).data ?? [];

/** A field of a stored line as a form holds it: as written, else empty. */
const field = (value: unknown) => (value === undefined || value === null ? "" : String(value));

/**
 * An invoice record's lines as a form holds them, each as written even when it is not a valid line
 * (`quantity: 5`, saved by a workflow, is "5" here): the form shows what is there and asks for it
 * to be finished, never drops it.
 */
export function recordDrafts(text: string): LineDraft[] {
  return drafted(
    recordList(text).map((line) => {
      const { description, quantity, unit, unitPrice } = (line ?? {}) as Record<string, unknown>;
      return {
        description: field(description),
        quantity: field(quantity),
        unit: UNITS.find((known) => known === unit) ?? "item",
        unitPrice: field(unitPrice),
      };
    }),
  );
}

/** Today, as an invoice's date: the browser's own day. */
export const today = () => new Date().toLocaleDateString("en-CA");

/** The day `days` after `day` ("2026-11-10"), as `invoice-send` dates an invoice's due day 14 days on. */
export const daysAfter = (day: string, days: number) =>
  new Date(Date.parse(day) + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * The amounts of the complete lines and their total, as `calculateInvoice` works them out, or
 * undefined while no line is complete or the amounts are past what an invoice takes. Only the
 * lines and the currency matter to the amounts, so the parties here are stand-ins: what the
 * invoice itself needs is checked when its PDF is made.
 */
export function amountsOf(lines: Line[], currency: Currency) {
  if (lines.length === 0) return undefined;
  const party = { name: "-" };
  try {
    return calculateInvoice({ number: "-", issuedOn: today(), issuer: party, recipient: party, currency, lines });
  } catch (err) {
    if (err instanceof InvoiceValidationError) return undefined;
    throw err;
  }
}

/** Makes the invoice's PDF in the page and saves it as a file: the bytes `renderInvoice` gives, never the printed page. */
export async function downloadPdf(invoice: InvoiceInput): Promise<void> {
  const { renderInvoice } = await import("sanoma/invoices/pdf");
  const file = await renderInvoice(invoice);
  const url = URL.createObjectURL(new Blob([file.bytes as Uint8Array<ArrayBuffer>], { type: file.mediaType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked once the download has begun: some browsers drop a download whose URL goes at once.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "9 Nov", for an ISO date or ms since the epoch. */
export const shortDate = (when: string | number) =>
  new Date(typeof when === "number" ? when : `${when}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: typeof when === "number" ? undefined : "UTC",
  });

/** How an invoice stands, and its tone: overdue is a sent invoice past its due date, not a status of its own. */
export function standing(invoice: { status: "draft" | "sent" | "paid"; dueOn?: string }) {
  if (invoice.status === "paid") return { label: "Paid", tone: "ok" } as const;
  if (invoice.status === "draft") return { label: "Draft", tone: "idle" } as const;
  if (invoice.dueOn && invoice.dueOn < today()) return { label: "Overdue", tone: "bad" } as const;
  return { label: "Sent", tone: "active" } as const;
}
