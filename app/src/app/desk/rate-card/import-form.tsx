"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { type ImportState, importSamples } from "./actions";

export function ImportForm() {
  const [state, action] = useActionState<ImportState | null, FormData>(importSamples, null);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="file">Spreadsheet of past quotes, saved as CSV</Label>
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required className="bg-white" />
      </div>
      <SubmitButton pendingText="Checking and importing…">Import past quotes</SubmitButton>
      {state && (
        <div role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
          <p>{state.message}</p>
          {state.problems && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.problems.map((p) => (
                <li key={p.line}>
                  Line {p.line}: {p.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
