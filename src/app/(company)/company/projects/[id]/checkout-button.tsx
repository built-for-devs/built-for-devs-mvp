"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { createCheckoutSession } from "@/lib/company/actions";

export function CheckoutButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");

    const result = await createCheckoutSession(projectId);
    if (!result.success || !result.url) {
      setError(result.error ?? "Failed to create checkout session");
      setLoading(false);
      return;
    }

    window.location.href = result.url;
  }

  return (
    <div>
      <Button onClick={handleCheckout} disabled={loading}>
        <CreditCard className="mr-2 h-4 w-4" />
        {loading ? "Redirecting..." : "Proceed to Payment"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
