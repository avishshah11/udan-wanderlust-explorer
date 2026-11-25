"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Method = "bank" | "upi" | "card_link" | "cash";

const select = "h-11 w-full rounded-md border border-udan-charcoal/30 bg-white px-3 text-base";

/**
 * Method and what the customer is told, for "Send payment details": only the
 * box the chosen method needs, pre-filled with Udan's bank or UPI details
 * from the environment when they are set.
 */
export function PaymentFields({ bank, upi }: { bank: string; upi: string }) {
  const [method, setMethod] = useState<Method>(!bank && upi ? "upi" : "bank");
  const details = method === "upi" ? upi : method === "bank" ? bank : "";

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="method">How they pay</Label>
        <select id="method" name="method" className={select} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
          <option value="upi">UPI</option>
          <option value="bank">Bank transfer</option>
          <option value="card_link">Card payment link</option>
          <option value="cash">Cash at the office (no email)</option>
        </select>
      </div>
      {method === "card_link" && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="card_link">Payment link from the Razorpay dashboard</Label>
          <Input id="card_link" name="card_link" type="url" placeholder="https://rzp.io/…" required />
        </div>
      )}
      {(method === "bank" || method === "upi") && (
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="instructions">{method === "upi" ? "UPI details the customer will see" : "Bank details the customer will see"}</Label>
          <Textarea
            // A new key per method, so switching method swaps in that method's details.
            key={method}
            id="instructions"
            name="instructions"
            rows={4}
            required
            defaultValue={details}
            placeholder={method === "upi" ? "UPI ID:\nName:" : "Account name:\nBank and branch:\nAccount number:\nIFSC:"}
          />
          {!details && (
            <p className="text-sm text-udan-gray">
              Type them here. They can also be saved once (<code>{method === "upi" ? "PAYMENT_DETAILS_UPI" : "PAYMENT_DETAILS_BANK"}</code>) so they
              are filled in for you.
            </p>
          )}
        </div>
      )}
      {method === "cash" && <p className="text-base text-udan-gray sm:col-span-3">No email is sent; the payment is recorded as expected at the office.</p>}
    </>
  );
}
