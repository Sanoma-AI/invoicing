import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { type Currency, currencySchema, type InvoiceInput } from "sanoma/invoices";
import { api, Link, notFound, useNavigate, useRouter } from "sanoma/site";
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
  PageHeader,
  Textarea,
  toast,
  ToneBadge,
} from "sanoma/ui";
import { completeLines, daysAfter, downloadPdf, drafted, recordDrafts, recordLines, shortDate, standing, today, typed } from "../invoice.ts";
import { LinesEditor } from "../lines.tsx";
import { InvoicePreview } from "../preview.tsx";
import { ended, RunCard, settled } from "../run-card.tsx";

export const Route = createFileRoute("/sites/invoicing/invoicing/invoices/$id")({
  // `run`: the send run just started, until the run names itself on the invoice (`sendRun`).
  validateSearch: (search: Record<string, unknown>): { run?: string } =>
    typeof search.run === "string" ? { run: search.run } : {},
  loaderDeps: ({ search }) => ({ run: search.run }),
  loader: ({ params, deps }) => load(params.id, deps.run),
  component: InvoicePage,
});

/** The invoice, the clients, the client's jobs, and the ledger of its send run (`run`, else the one it names). */
async function load(id: string, run: string | undefined) {
  // A run's ledger before the invoice, so the invoice is never behind what its run shows.
  const [started, clients] = await Promise.all([
    run ? api.invoicingInvoiceSend.ledger(run) : undefined,
    api.data.clients.list({ limit: 1000 }),
  ]);
  const invoice = await api.data.invoicing.invoices.get({ key: id });
  if (!invoice) throw notFound();
  // The run the invoice names is its send, whatever run the URL still names.
  const named = invoice.record.sendRun;
  const [jobs, ledger] = await Promise.all([
    api.data.jobs.list({ where: { client: invoice.record.client }, limit: 1000 }),
    named && named !== run ? api.invoicingInvoiceSend.ledger(named) : (started ?? []),
  ]);
  return { invoice: invoice.record, clients, jobs, ledger };
}

type Data = Awaited<ReturnType<typeof load>>;
type Invoice = Data["invoice"];
type Job = Data["jobs"][number]["record"];

/** An invoice: its editor while it is a draft, with Send; once sent, how it went, with Mark paid and Remind. */
function InvoicePage() {
  const data = Route.useLoaderData();
  const { run } = Route.useSearch();
  const router = useRouter();
  // Ask again every 2 s while the send run is under way (a run just started may have no ledger yet),
  // until it ends or sleeps.
  useEffect(() => {
    if ((!run && data.ledger.length === 0) || settled(data.ledger)) return;
    const timer = setTimeout(() => void router.invalidate({ filter: (match) => match.routeId === Route.id }), 2000);
    return () => clearTimeout(timer);
  }, [data, run, router]);
  // A new form for each version of the invoice: a draft's edits never outlive its sending, and a
  // save refused because someone else saved first shows their version, never overwrites it next time.
  // A draft is its send run's from Send until the run ends: no edits and no second Send meanwhile.
  const sending = Boolean(run ?? data.invoice.sendRun) && !ended(data.ledger);
  return <Invoice key={JSON.stringify(data.invoice)} {...data} sending={sending} />;
}

function Invoice({ invoice, clients, jobs, ledger, sending }: Data & { sending: boolean }) {
  const id = useId();
  const router = useRouter();
  const navigate = useNavigate();
  const draft = invoice.status === "draft";
  const [client, setClient] = useState(invoice.client);
  const [from, setFrom] = useState({ name: invoice.from, email: invoice.fromEmail });
  const [currency, setCurrency] = useState<Currency>(invoice.currency);
  // A draft with no lines yet opens with an empty one to type into.
  const [lines, setLines] = useState(() => {
    const saved = recordDrafts(invoice.lines);
    return saved.length > 0 || !draft ? saved : drafted([{}]);
  });
  const [notes, setNotes] = useState(invoice.notes ?? "");
  // The jobs whose lines were added here, by line: each is marked as on this invoice when it is saved.
  const [fromJobs, setFromJobs] = useState<Map<number, Job>>(new Map());
  const [busy, setBusy] = useState(false);

  const recipient = clients.find(({ key }) => key === client)?.record;
  const complete = completeLines(lines);
  // A line typed on but not valid yet would be left out of what is saved and sent, so neither waits for it.
  const unfinished = lines.filter(typed).length > complete.length;
  const ready = complete.length > 0 && !unfinished && Boolean(recipient && from.name && from.email);
  const edited: Invoice = {
    ...invoice,
    client,
    from: from.name,
    fromEmail: from.email,
    currency,
    lines: JSON.stringify(complete),
    notes: notes.trim() ? notes : undefined,
  };
  // The jobs read are the saved client's: none to add once another client is picked.
  const unbilled = client === invoice.client ? jobs.filter(({ record }) => !record.invoice) : [];

  /** Runs `act`, saying what went wrong, and reads the page again after. */
  async function doing(act: () => Promise<unknown>) {
    setBusy(true);
    try {
      await act();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      await router.invalidate();
    }
  }

  async function save() {
    await api.data.invoicing.invoices.save({ record: edited, ifRecord: invoice });
    try {
      for (const [key, job] of fromJobs) {
        if (lines.some((line) => line.key === key)) {
          await api.data.jobs.save({ record: { ...job, invoice: invoice.id }, ifRecord: job });
        }
      }
    } finally {
      // The jobs are read again after: one whose save failed shows as not on an invoice, to add again.
      setFromJobs(new Map());
    }
  }

  async function send() {
    await save();
    const { runId } = await api.invoicingInvoiceSend.start({ id: invoice.id });
    await navigate({ to: ".", search: { run: runId } });
  }

  function addJob(job: Job) {
    const [line] = drafted([{ description: job.description, quantity: String(job.quantity), unit: job.unit, unitPrice: String(job.rate) }]);
    setLines([...lines.filter(typed), line!]);
    setFromJobs(new Map(fromJobs).set(line!.key, job));
  }

  const { label, tone } = standing(invoice);
  const shown = draft ? edited : invoice;
  // What the preview shows and the PDF is made of.
  const input: InvoiceInput = {
    number: invoice.number ?? "Draft",
    // A draft dated as Send will date it: today, due in 14 days.
    issuedOn: invoice.issuedOn ?? today(),
    dueOn: invoice.dueOn ?? daysAfter(invoice.issuedOn ?? today(), 14),
    issuer: { name: shown.from, ...(shown.fromEmail && { email: shown.fromEmail }) },
    recipient: {
      name: shown.client,
      ...(recipient?.email && { email: recipient.email }),
      ...(recipient?.address && { address: { lines: [recipient.address] } }),
    },
    currency: shown.currency,
    lines: draft ? complete : recordLines(invoice.lines),
    ...(shown.notes && { notes: shown.notes }),
  };
  const dates = [
    invoice.issuedOn && `issued ${shortDate(invoice.issuedOn)}`,
    invoice.dueOn && `due ${shortDate(invoice.dueOn)}`,
    invoice.remindedOn && `reminded ${shortDate(invoice.remindedOn)}`,
    invoice.paidOn && `paid ${shortDate(invoice.paidOn)}`,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title={invoice.number ?? "Draft"}
        crumbs={[
          <Link key="invoices" to="/sites/invoicing/invoicing/invoices">
            Invoices
          </Link>,
        ]}
        action={
          <>
            <ToneBadge tone={tone} dot>
              {label}
            </ToneBadge>
            {draft && (
              <>
                <Button variant="outline" disabled={busy || sending || unfinished} onClick={() => doing(save)}>
                  Save
                </Button>
                <Button disabled={busy || sending || !ready} onClick={() => doing(send)}>
                  Send
                </Button>
              </>
            )}
            {invoice.status === "sent" && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    doing(async () => {
                      await api.invoicingInvoiceRemind.start({ id: invoice.id });
                      toast.success(`A reminder of ${invoice.number} is on its way to ${invoice.client}`);
                    })
                  }
                >
                  Remind
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    doing(() =>
                      api.data.invoicing.invoices.save({ record: { ...invoice, status: "paid", paidOn: today() }, ifRecord: invoice }),
                    )
                  }
                >
                  Mark paid
                </Button>
              </>
            )}
          </>
        }
      />
      <div className="grid items-start gap-8 lg:grid-cols-2">
        {draft ? (
          <form className="min-w-0" onSubmit={(e) => e.preventDefault()}>
            <fieldset disabled={sending} className="min-w-0">
              <FieldGroup>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`${id}-client`}>Client</FieldLabel>
                    <NativeSelect id={`${id}-client`} className="w-full" value={client} onChange={(e) => setClient(e.target.value)}>
                      {clients.map(({ key }) => (
                        <NativeSelectOption key={key} value={key}>
                          {key}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                  <Field>
                    <FieldLabel htmlFor={`${id}-from`}>From</FieldLabel>
                    <Input id={`${id}-from`} value={from.name} onChange={(e) => setFrom({ ...from, name: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-from-email`}>From email</FieldLabel>
                    <Input
                      id={`${id}-from-email`}
                      type="email"
                      value={from.email}
                      onChange={(e) => setFrom({ ...from, email: e.target.value })}
                    />
                  </Field>
                </div>
                <FieldSet>
                  <FieldLegend>Lines</FieldLegend>
                  <LinesEditor lines={lines} onChange={setLines} />
                  {unfinished && (
                    <p className="text-sm text-muted-foreground">
                      Finish or remove the lines that are not complete: each needs a description, a quantity above 0 and a
                      price.
                    </p>
                  )}
                </FieldSet>
                {unbilled.length > 0 && (
                  <FieldSet>
                    <FieldLegend>{client}'s jobs not on an invoice</FieldLegend>
                    <ul className="grid gap-2">
                      {unbilled.map(({ record: job }) => (
                        <li key={job.id} className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            {job.description} · {job.quantity} {job.unit} × {job.rate}
                            {job.doneOn && <span className="text-muted-foreground"> · {shortDate(job.doneOn)}</span>}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={[...fromJobs].some(
                            ([key, added]) => added.id === job.id && lines.some((line) => line.key === key),
                          )}
                            onClick={() => addJob(job)}
                          >
                            Add
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </FieldSet>
                )}
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
            </fieldset>
          </form>
        ) : (
          ledger.length > 0 && <RunCard ledger={ledger} />
        )}
        <div className="grid min-w-0 gap-4">
          <InvoicePreview invoice={input} dates={dates.join(" · ")} />
          <div>
            <Button variant="outline" disabled={busy} onClick={() => doing(() => downloadPdf(input))}>
              Download PDF
            </Button>
          </div>
          {draft && ledger.length > 0 && <RunCard ledger={ledger} />}
        </div>
      </div>
    </>
  );
}
