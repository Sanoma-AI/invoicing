import type { LedgerRecord } from "sanoma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatusDot, type Tone, ToneBadge } from "sanoma/ui";
import { shortDate } from "./invoice.ts";

/** What a step of the run card says: done, under way, waiting, failed or still to come. */
interface Step {
  title: string;
  tone: Tone;
  detail: string;
}

type Call = Extract<LedgerRecord, { type: "op.called" }>;
type Requested = Extract<LedgerRecord, { type: "approval.requested" }>;
/** What the run card reads of an email's input: the ledger keeps the files' names, not their bytes. */
type Email = { to?: string | string[]; subject?: string; attachments?: { filename: string }[] };

/** Whether the run has ended, finished or failed. */
export const ended = (ledger: LedgerRecord[]) => ["run.finished", "run.failed"].includes(ledger.at(-1)?.type ?? "");

/** Whether the run has stopped for now: ended, asleep until a day to come, or waiting on someone's approval. */
export const settled = (ledger: LedgerRecord[]) =>
  ended(ledger) || ["sleep.started", "approval.requested"].includes(ledger.at(-1)?.type ?? "");

/**
 * A run of `invoice-send`, step by step, from its ledger: the PDF, the email that carried it, the
 * seven days' wait and the reminder unless the invoice was paid by then.
 */
export function RunCard({ ledger }: { ledger: LedgerRecord[] }) {
  const call = (name: string) => ledger.find((r): r is Call => r.type === "op.called" && r.name === name);
  const sent = call("Email the invoice");
  const reminder = call("Email the reminder");
  const sleep = ledger.find((r) => r.type === "sleep.started");
  const asleep = sleep !== undefined && ledger.at(-1) === sleep;
  const end = ledger.find((r) => r.type === "run.finished" || r.type === "run.failed");
  const pending = ledger.filter(
    (r): r is Requested =>
      r.type === "approval.requested" && !ledger.some((d) => d.type === "approval.decided" && d.approval === r.approval),
  );
  const email = sent?.input as Email | undefined;
  const files = email?.attachments?.map((file) => file.filename).join(", ");
  /** A step still to come, unless `how` says otherwise. */
  const step = (title: string, how?: Omit<Step, "title">): Step => ({ title, tone: "idle", detail: "", ...how });

  const steps: Step[] = [
    step("Make the PDF", sent && !sent.error ? { tone: "ok", detail: files ?? "" } : end ? { tone: "off", detail: "" } : undefined),
    step(
      "Email it",
      sent &&
        (sent.error
          ? { tone: "bad", detail: sent.error.message }
          : { tone: "ok", detail: `${[email?.to].flat().join(", ")}, "${email?.subject}", ${files} attached` }),
    ),
    step("Wait 7 days", sleep && { tone: asleep ? "waiting" : "ok", detail: `until ${shortDate(sleep.until)}` }),
    step(
      "Remind, unless paid",
      reminder
        ? { tone: reminder.error ? "bad" : "ok", detail: reminder.error?.message ?? `on ${shortDate(reminder.at)}` }
        : end?.type === "run.finished" && sleep
          ? { tone: "off", detail: "paid by then: no reminder" }
          : undefined,
    ),
  ];

  const [label, tone]: [string, Tone] =
    end?.type === "run.failed"
      ? ["Failed", "bad"]
      : end
        ? ["Done", "ok"]
        : pending.length || asleep
          ? ["Waiting", "waiting"]
          : ["Running", "active"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send an invoice</CardTitle>
        <CardDescription>
          <ToneBadge tone={tone} dot>
            {label}
          </ToneBadge>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {pending.map((r) => (
          <StepRow
            key={r.id}
            step={{ title: "Approval", tone: "waiting", detail: `${r.title}: waiting in the Inbox` }}
          />
        ))}
        {steps.map((s) => (
          <StepRow key={s.title} step={s} />
        ))}
        {end?.type === "run.failed" && <p className="text-sm text-muted-foreground">{end.error.message}</p>}
      </CardContent>
    </Card>
  );
}

function StepRow({ step }: { step: Step }) {
  return (
    <div className="flex items-start gap-3">
      <StatusDot tone={step.tone} className="mt-1.5" />
      <div className="min-w-0">
        <p className="font-medium">{step.title}</p>
        {step.detail && <p className="text-sm wrap-anywhere text-muted-foreground">{step.detail}</p>}
      </div>
    </div>
  );
}
