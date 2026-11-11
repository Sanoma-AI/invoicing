import { formatMoney, type InvoiceInput } from "sanoma/invoices";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "sanoma/ui";
import { amountsOf } from "./invoice.ts";

type Party = InvoiceInput["issuer"];

/**
 * The invoice as it reads, the same input its PDF is made of: who it is from and to, its complete
 * lines with their amounts, and the total.
 */
export function InvoicePreview({
  invoice: { number, issuer, recipient, currency, lines, notes },
  dates,
}: {
  invoice: InvoiceInput;
  /** "issued 9 Nov · due 23 Nov", or what is known of it. */
  dates?: string;
}) {
  const amounts = amountsOf(lines, currency);
  const money = (minor: number) => formatMoney(minor, currency);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Invoice</CardTitle>
        <CardDescription>{[number, dates].filter(Boolean).join(" · ") || "A draft"}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <PartyBlock label="From" party={issuer} placeholder="Your business" />
          <PartyBlock label="To" party={recipient} placeholder="Your client" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {amounts?.lines.map((line, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-normal">{line.description}</TableCell>
                <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{line.unitPrice}</TableCell>
                <TableCell className="text-right tabular-nums">{money(line.amountMinor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{money(amounts?.totals.dueMinor ?? 0)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        {notes && <p className="whitespace-pre-line text-muted-foreground">{notes}</p>}
      </CardContent>
    </Card>
  );
}

function PartyBlock({ label, party, placeholder }: { label: string; party: Party; placeholder: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{party.name || <span className="text-muted-foreground">{placeholder}</span>}</p>
      {party.email && <p className="wrap-anywhere">{party.email}</p>}
      {party.address && <p>{party.address.lines.join(", ")}</p>}
    </div>
  );
}
