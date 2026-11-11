import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { type Currency, currencySchema, type InvoiceInput, InvoiceValidationError } from "sanoma/invoices";
import {
  Button,
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  NativeSelect,
  NativeSelectOption,
  Notice,
  PageHeader,
  Textarea,
} from "sanoma/ui";
import { completeLines, downloadPdf, drafted, type Line, linesSchema, today } from "../invoice.ts";
import { LinesEditor } from "../lines.tsx";
import { InvoicePreview } from "../preview.tsx";

/**
 * The lines the tool opens with, as its URL's search may give them: `?lines=[…]` is a JSON list of
 * `{ description, quantity, unit, unitPrice }` (quantities and prices as decimal text, `unit` one
 * of visit, hour, night, job, item or charge), and `?currency=EUR`. A page for one trade links here
 * with that trade's lines; without them the tool opens on these.
 */
const STARTING_LINES: Line[] = [
  { description: "Service visit", quantity: "5", unit: "visit", unitPrice: "25.00" },
  { description: "Additional service", quantity: "5", unit: "visit", unitPrice: "8.00" },
  { description: "Weekend surcharge", quantity: "1", unit: "charge", unitPrice: "15.00" },
];

export const Route = createFileRoute("/sites/invoicing/invoicing/tool")({
  validateSearch: (search: Record<string, unknown>): { lines?: Line[]; currency?: Currency } => ({
    lines: linesSchema.min(1).max(100).safeParse(search.lines).data,
    currency: currencySchema.safeParse(search.currency).data,
  }),
  component: Tool,
});

/**
 * The free invoice tool: an invoice made and turned into a PDF in the page. It calls nothing:
 * nothing is stored and nothing is sent, so it works for anyone, signed in or not.
 */
function Tool() {
  const search = Route.useSearch();
  const id = useId();
  const [number, setNumber] = useState("INV-001");
  const [issuedOn, setIssuedOn] = useState(today);
  const [dueOn, setDueOn] = useState("");
  const [from, setFrom] = useState({ name: "", email: "" });
  const [to, setTo] = useState({ name: "", email: "" });
  const [currency, setCurrency] = useState<Currency>(search.currency ?? "USD");
  const [lines, setLines] = useState(() => drafted(search.lines ?? STARTING_LINES));
  const [notes, setNotes] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [making, setMaking] = useState(false);

  const invoice: InvoiceInput = {
    number,
    issuedOn,
    ...(dueOn && { dueOn }),
    issuer: { name: from.name, ...(from.email && { email: from.email }) },
    recipient: { name: to.name, ...(to.email && { email: to.email }) },
    currency,
    lines: completeLines(lines),
    ...(notes.trim() && { notes }),
  };

  async function download() {
    setMaking(true);
    try {
      await downloadPdf(invoice);
      setProblems([]);
    } catch (err) {
      setProblems(
        err instanceof InvoiceValidationError
          ? err.issues.map((issue) => `${issue.path.join(" ")}: ${issue.message}`)
          : [err instanceof Error ? err.message : String(err)],
      );
    } finally {
      setMaking(false);
    }
  }

  return (
    <>
      <PageHeader title="Invoice tool" />
      <p className="max-w-prose text-muted-foreground">
        Your business, the client, the lines. The totals follow as you type, and the PDF is made in this page: nothing
        is stored or sent.
      </p>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <form className="min-w-0" onSubmit={(e) => e.preventDefault()}>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>From</FieldLegend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-from`}>Your business</FieldLabel>
                  <Input id={`${id}-from`} value={from.name} onChange={(e) => setFrom({ ...from, name: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-from-email`}>Your email</FieldLabel>
                  <Input
                    id={`${id}-from-email`}
                    type="email"
                    value={from.email}
                    onChange={(e) => setFrom({ ...from, email: e.target.value })}
                  />
                </Field>
              </div>
            </FieldSet>
            <FieldSet>
              <FieldLegend>To</FieldLegend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-to`}>Client</FieldLabel>
                  <Input id={`${id}-to`} value={to.name} onChange={(e) => setTo({ ...to, name: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-to-email`}>Client email</FieldLabel>
                  <Input
                    id={`${id}-to-email`}
                    type="email"
                    value={to.email}
                    onChange={(e) => setTo({ ...to, email: e.target.value })}
                  />
                </Field>
              </div>
            </FieldSet>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <Field>
                <FieldLabel htmlFor={`${id}-number`}>Number</FieldLabel>
                <Input id={`${id}-number`} value={number} onChange={(e) => setNumber(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-issued`}>Date</FieldLabel>
                <Input id={`${id}-issued`} type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-due`}>Due</FieldLabel>
                <Input id={`${id}-due`} type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-currency`}>Currency</FieldLabel>
                <NativeSelect
                  id={`${id}-currency`}
                  className="w-full"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  {currencySchema.options.map((code) => (
                    <NativeSelectOption key={code} value={code}>
                      {code}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <FieldSet>
              <FieldLegend>Lines</FieldLegend>
              <LinesEditor lines={lines} onChange={setLines} />
            </FieldSet>
            <Field>
              <FieldLabel htmlFor={`${id}-notes`}>Notes</FieldLabel>
              <Textarea
                id={`${id}-notes`}
                placeholder="Payment details, or a thank-you"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </form>
        <div className="grid min-w-0 gap-4">
          <InvoicePreview invoice={invoice} dates={[issuedOn, dueOn && `due ${dueOn}`].filter(Boolean).join(" · ")} />
          {problems.length > 0 && (
            <Notice variant="destructive">No PDF yet: {problems.join("; ")}.</Notice>
          )}
          <div>
            <Button type="button" disabled={making} onClick={download}>
              {making ? "Making the PDF…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
