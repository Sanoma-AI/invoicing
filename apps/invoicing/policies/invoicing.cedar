// Who may send an invoice or a reminder: admin. Anyone else's send waits for admin's approval
// before the run takes a number, makes the PDF or emails the client.
@id("invoicing-sends-wait-for-admin")
@hold("admin")
@title("Send this invoice?")
forbid (
  principal,
  action in [Sanoma::Action::"workflow:invoicing.invoice-send", Sanoma::Action::"workflow:invoicing.invoice-remind"],
  resource
)
unless { principal in Sanoma::Group::"admin" };

// An invoice that went out is the company's record of it: it may be marked paid, never deleted.
@id("invoicing-keeps-sent-invoices")
@reason("A sent invoice is kept: mark it paid instead")
forbid (principal, action == Sanoma::Action::"data.invoicing.invoices.delete", resource)
when { context has before && context.before.status != "draft" };

// Nor is it rewritten: once sent, its client, currency and lines stay as they went out, it never
// goes back to a draft (and so to a delete), and a paid one stays paid.
@id("invoicing-keeps-what-was-sent")
@reason("A sent invoice stays as it went out: start a new draft instead")
forbid (principal, action == Sanoma::Action::"data.invoicing.invoices.save", resource)
when {
  context has before &&
  context.before.status != "draft" &&
  (context.input.record.status == "draft" ||
   (context.before.status == "paid" && context.input.record.status != "paid") ||
   context.input.record.lines != context.before.lines ||
   context.input.record.client != context.before.client ||
   context.input.record.currency != context.before.currency)
};
