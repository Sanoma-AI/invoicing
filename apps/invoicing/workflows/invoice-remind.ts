import { resend } from "@sanoma-ai/connector-resend";
import { defineWorkflow, z } from "sanoma";
import { renderInvoice } from "sanoma/invoices/pdf";
import { clients } from "../../../resources/data.ts";
import { invoices } from "../resources/data.ts";
import { invoiceEmail, invoiceInput, isoDay } from "./invoice.ts";

/**
 * Reminds a client of an invoice they have not paid: emails them with its PDF attached again, and
 * notes the day. An invoice that is paid, or still a draft, is left alone.
 */
export default defineWorkflow({
  name: "invoice-remind",
  title: "Remind a client",
  trigger: "manual",
  input: z.object({
    /** The invoice's id in `invoicing.invoices`. */
    id: z.string().min(1),
  }),
  uses: [invoices.get, invoices.save, clients.get, resend.emails.send],
  run: async (ctx, { id }) => {
    const found = await ctx.data.invoicing.invoices.get({ key: id }, { name: "Read the invoice" });
    const unpaid = found?.record.status === "sent";
    const client = unpaid && (await ctx.data.clients.get({ key: found.record.client }, { name: "Read the client" }));
    if (unpaid && client) {
      const file = await renderInvoice(invoiceInput(found.record, client.record));
      await ctx.resend.emails.send(invoiceEmail(found.record, client.record, file, true), {
        name: "Email the reminder",
      });
      const remindedOn = isoDay(await ctx.now());
      await ctx.data.invoicing.invoices.save(
        { record: { ...found.record, remindedOn }, ifRecord: found.record },
        { name: "Note the reminder" },
      );
    }
    return { reminded: Boolean(unpaid && client) };
  },
});
