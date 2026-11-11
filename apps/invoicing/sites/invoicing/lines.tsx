import { useId } from "react";
import { Button, Field, FieldLabel, Input, NativeSelect, NativeSelectOption } from "sanoma/ui";
import { drafted, type LineDraft, UNITS } from "./invoice.ts";

/**
 * The lines of an invoice as rows of fields: what, how many, of what unit, at what price. The
 * labels show on the first row only; every row's are there for a screen reader.
 */
export function LinesEditor({
  lines,
  onChange,
  disabled = false,
}: {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const set = (key: number, field: Exclude<keyof LineDraft, "key">, value: string) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, [field]: value } : line)));

  return (
    <div className="grid gap-3">
      <ul className="grid gap-3">
        {lines.map((line, i) => {
          // By place, not `key`: keys count up per module, so the server's and the browser's differ.
          const at = `${id}-${i}`;
          const label = i === 0 ? undefined : "sr-only";
          return (
            <li
              key={line.key}
              className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 @lg/field-group:grid-cols-[minmax(0,1fr)_4.5rem_6rem_6rem_auto]"
            >
              <Field className="col-span-4 @lg/field-group:col-span-1">
                <FieldLabel className={label} htmlFor={`${at}-description`}>
                  Line
                </FieldLabel>
                <Input
                  id={`${at}-description`}
                  value={line.description}
                  placeholder="What was done"
                  disabled={disabled}
                  onChange={(e) => set(line.key, "description", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel className={label} htmlFor={`${at}-quantity`}>
                  Qty
                </FieldLabel>
                <Input
                  id={`${at}-quantity`}
                  inputMode="decimal"
                  value={line.quantity}
                  disabled={disabled}
                  onChange={(e) => set(line.key, "quantity", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel className={label} htmlFor={`${at}-unit`}>
                  Unit
                </FieldLabel>
                <NativeSelect
                  id={`${at}-unit`}
                  className="w-full"
                  value={line.unit}
                  disabled={disabled}
                  onChange={(e) => set(line.key, "unit", e.target.value)}
                >
                  {UNITS.map((unit) => (
                    <NativeSelectOption key={unit} value={unit}>
                      {unit}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel className={label} htmlFor={`${at}-price`}>
                  Rate
                </FieldLabel>
                <Input
                  id={`${at}-price`}
                  inputMode="decimal"
                  value={line.unitPrice}
                  disabled={disabled}
                  onChange={(e) => set(line.key, "unitPrice", e.target.value)}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove ${line.description || `line ${i + 1}`}`}
                disabled={disabled}
                onClick={() => onChange(lines.filter(({ key }) => key !== line.key))}
              >
                Remove
              </Button>
            </li>
          );
        })}
      </ul>
      {!disabled && (
        <div>
          <Button type="button" variant="outline" onClick={() => onChange([...lines, ...drafted([{}])])}>
            Add a line
          </Button>
        </div>
      )}
    </div>
  );
}
