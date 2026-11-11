import { resend } from "@sanoma-ai/connector-resend";
import { defineWorkflow, z } from "sanoma";
import { calculateInvoice } from "sanoma/invoices";
import { renderInvoice } from "sanoma/invoices/pdf";
import { clients } from "../../../resources/data.ts";
import { invoices, sequence } from "../resources/data.ts";
import { invoiceEmail, invoiceInput, isoDay } from "./invoice.ts";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Sends a draft invoice: checks it, numbers it unless it has a number, makes its PDF, emails it to the client
 * with the PDF attached, and marks it sent. Seven days later, unless it has been paid, emails the
 * client a reminder with the PDF attached again. Anything but a draft is left alone, and the
 * output says why.
 */
export default defineWorkflow({
  name: "invoice-send",
  title: "Send an invoice",
  trigger: "manual",
  input: z.object({
    /** The invoice's id in `invoicing.invoices`. */
    id: z.string().min(1),
  }),
  uses: [invoices.get, invoices.save, sequence.get, sequence.save, clients.get, resend.emails.send, "sleep"],
  run: async (ctx, { id }) => {
    const draft = await ctx.data.invoicing.invoices.get({ key: id }, { name: "Read the draft" });
    const isDraft = draft?.record.status === "draft";
    const client = isDraft && (await ctx.data.clients.get({ key: draft.record.client }, { name: "Read the client" }));
    let outcome: { sent: boolean; why?: string; number?: string; file?: string; reminded?: boolean };
    if (isDraft && client) {
      const issuedOn = draft.record.issuedOn ?? isoDay(await ctx.now());
      const dueOn = draft.record.dueOn ?? isoDay(Date.parse(issuedOn) + 14 * DAY);
      // Checked before it takes a number: an invoice `sanoma/invoices` refuses fails the run here,
      // naming the field, and no number is spent on it.
      calculateInvoice(invoiceInput({ ...draft.record, number: draft.record.number ?? "INV-0000", issuedOn, dueOn }, client.record));
      // Claimed by this run before anything else: its page stops taking edits and a second Send, an
      // edit made anyway fails a save below instead of going out unseen, and a claim that fails
      // spends no number.
      const claimed = { ...draft.record, sendRun: ctx.runId };
      await ctx.data.invoicing.invoices.save({ record: claimed, ifRecord: draft.record }, { name: "Claim it" });
      let numbered = claimed;
      if (!claimed.number) {
        const counter = await ctx.data.invoicing.sequence.get({ key: "invoice" }, { name: "Read the next number" });
        const next = counter?.record.next ?? 1;
        const taken = { name: "invoice", next: next + 1 };
        await ctx.data.invoicing.sequence.save(
          counter ? { record: taken, ifRecord: counter.record } : { record: taken, ifAbsent: true },
          { name: "Take the number" },
        );
        numbered = { ...claimed, number: `INV-${String(next).padStart(4, "0")}` };
        await ctx.data.invoicing.invoices.save({ record: numbered, ifRecord: claimed }, { name: "Number it" });
      }
      const sent = { ...numbered, status: "sent" as const, issuedOn, dueOn };

      // Made by a plain function, not a step: a replay makes the same bytes again.
      const file = await renderInvoice(invoiceInput(sent, client.record));
      await ctx.resend.emails.send(invoiceEmail(sent, client.record, file, false), { name: "Email the invoice" });
      await ctx.data.invoicing.invoices.save({ record: sent, ifRecord: numbered }, { name: "Mark it sent" });

      await ctx.sleep({ days: 7 }, { name: "Wait 7 days" });
      const later = await ctx.data.invoicing.invoices.get({ key: id }, { name: "Read it again" });
      // Unpaid and not reminded since: a reminder sent from the page in the meantime is not repeated.
      const unpaid = later?.record.status === "sent" && !later.record.remindedOn;
      // The client as they are now: an address changed during the week is the one reminded.
      const now = unpaid && (await ctx.data.clients.get({ key: later.record.client }, { name: "Read the client again" }));
      if (unpaid && now) {
        await ctx.resend.emails.send(invoiceEmail(later.record, now.record, file, true), {
          name: "Email the reminder",
        });
        const remindedOn = isoDay(await ctx.now());
        await ctx.data.invoicing.invoices.save(
          { record: { ...later.record, remindedOn }, ifRecord: later.record },
          { name: "Note the reminder" },
        );
      }
      outcome = { sent: true, number: sent.number, file: file.filename, reminded: Boolean(unpaid && now) };
    } else {
      const why = !draft
        ? `no invoice ${id}`
        : draft.record.status !== "draft"
          ? `it is ${draft.record.status}`
          : `no client ${draft.record.client}`;
      outcome = { sent: false, why };
    }
    return outcome;
  },
});
