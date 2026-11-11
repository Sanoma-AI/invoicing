import { createFileRoute } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { formatMoney } from "sanoma/invoices";
import { api, Link, useNavigate } from "sanoma/site";
import {
  Button,
  Field,
  FieldLabel,
  NativeSelect,
  NativeSelectOption,
  Nothing,
  PageHeader,
  Region,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  ToneBadge,
} from "sanoma/ui";
import { amountsOf, recordLines, shortDate, standing } from "../invoice.ts";

export const Route = createFileRoute("/sites/invoicing/invoicing/invoices/")({
  loader: async () => {
    const [invoices, clients] = await Promise.all([
      api.data.invoicing.invoices.list({ limit: 1000 }),
      api.data.clients.list({ limit: 1000 }),
    ]);
    return { invoices, clients };
  },
  component: Invoices,
});

const byNumber = new Intl.Collator("en", { numeric: true }).compare;

/** Every invoice, drafts first, then the newest number; and a new draft for a client. */
function Invoices() {
  const { invoices, clients } = Route.useLoaderData();
  const navigate = useNavigate();
  const id = useId();
  const [client, setClient] = useState(clients[0]?.key ?? "");
  // Sorted and totalled once per load, not on each pick of the client below.
  const rows = useMemo(
    () =>
      invoices
        .map(({ record }) => ({
          ...record,
          total: amountsOf(recordLines(record.lines), record.currency)?.totals.dueMinor ?? 0,
        }))
        .toSorted(
          (a, b) => Number(b.status === "draft") - Number(a.status === "draft") || byNumber(b.number ?? "", a.number ?? ""),
        ),
    [invoices],
  );

  async function newDraft() {
    // Who it is from and its currency, as the latest invoice had them.
    const latest = rows.find((invoice) => invoice.status !== "draft") ?? rows[0];
    const draft = {
      id: `draft-${crypto.randomUUID().slice(0, 8)}`,
      client,
      status: "draft" as const,
      currency: latest?.currency ?? "USD",
      lines: "[]",
      from: latest?.from ?? "",
      fromEmail: latest?.fromEmail ?? "",
    };
    try {
      await api.data.invoicing.invoices.save({ record: draft, ifAbsent: true });
      await navigate({ to: "/sites/invoicing/invoicing/invoices/$id", params: { id: draft.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <PageHeader title="Invoices" count={rows.length} />
      {rows.length === 0 ? (
        <Nothing title="No invoices yet">Start a draft for a client below.</Nothing>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((invoice) => {
              const { label, tone } = standing(invoice);
              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      to="/sites/invoicing/invoicing/invoices/$id"
                      params={{ id: invoice.id }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {invoice.number ?? "Draft"}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.client}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(invoice.total, invoice.currency)}</TableCell>
                  <TableCell>
                    <ToneBadge tone={tone} dot>
                      {label}
                    </ToneBadge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {invoice.dueOn ? shortDate(invoice.dueOn) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <Region title="New invoice">
        {clients.length === 0 ? (
          <p className="text-muted-foreground">Add a client to the company's clients first: an invoice is for one.</p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void newDraft();
            }}
          >
            <Field className="w-64 max-w-full">
              <FieldLabel htmlFor={`${id}-client`}>Client</FieldLabel>
              <NativeSelect id={`${id}-client`} className="w-full" value={client} onChange={(e) => setClient(e.target.value)}>
                {clients.map(({ key }) => (
                  <NativeSelectOption key={key} value={key}>
                    {key}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Button type="submit">Start a draft</Button>
          </form>
        )}
      </Region>
    </>
  );
}
