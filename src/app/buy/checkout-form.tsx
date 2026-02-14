"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Minus, Plus } from "lucide-react";

interface SelectedProfile {
  jobTitle: string | null;
  roleTypes: string[];
  seniority: string | null;
  languages: string[];
  frameworks: string[];
  buyingInfluence: string | null;
  paidTools: string[];
  country: string | null;
}

export function CheckoutForm() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<SelectedProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [numEvaluations, setNumEvaluations] = useState(3);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricePerEval = 399;
  const total = numEvaluations * pricePerEval;

  // Load selected profiles from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("bfd_selected_profiles");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SelectedProfile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles(parsed);
          setNumEvaluations(Math.max(3, parsed.length));
          setLoaded(true);
          return;
        }
      } catch {
        // Invalid JSON — fall through to redirect
      }
    }
    // No valid profiles — redirect to homepage
    router.replace("/");
  }, [router]);

  async function handleCheckout() {
    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/buy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedProfiles: profiles,
          productName: productName.trim(),
          productUrl: productUrl.trim(),
          email: email.trim(),
          contactName: contactName.trim(),
          companyName: companyName.trim(),
          numEvaluations,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setCheckoutLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to create checkout session");
      setCheckoutLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Section A: Selected Developers */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">
            Get real developer feedback
          </h1>
          <p className="mt-1 text-muted-foreground">
            You&apos;ve selected {profiles.length} developer profile
            {profiles.length !== 1 ? "s" : ""}. We&apos;ll match developers
            like these from our network to evaluate your product.
          </p>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-muted/60">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Title</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seniority</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frameworks</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((dev, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {dev.jobTitle ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {dev.seniority ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {dev.languages.length > 0
                        ? dev.languages.slice(0, 3).map((l) => (
                            <Badge
                              key={l}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {l}
                            </Badge>
                          ))
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {dev.frameworks.length > 0
                        ? dev.frameworks.slice(0, 3).map((f) => (
                            <Badge
                              key={f}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {f}
                            </Badge>
                          ))
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {dev.country ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      {/* Section B: Product Info */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Your product</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us about the product developers will evaluate.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Acme CLI"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productUrl">Product URL *</Label>
            <Input
              id="productUrl"
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://acme.dev"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section C: Contact Info */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Contact info</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll send evaluation results and updates to this email.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactName">Your Name *</Label>
            <Input
              id="contactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.dev"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section D: Package Selection */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Choose your package</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each evaluation includes a screen recording of a matched developer
            using your product for the first time, plus their candid feedback.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Label className="shrink-0">Number of evaluations</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setNumEvaluations(Math.max(3, numEvaluations - 1))
              }
              disabled={numEvaluations <= 3}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-lg font-semibold">
              {numEvaluations}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setNumEvaluations(Math.min(20, numEvaluations + 1))
              }
              disabled={numEvaluations >= 20}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {numEvaluations} evaluation{numEvaluations > 1 ? "s" : ""} ×
                  ${pricePerEval}
                </p>
              </div>
              <p className="text-2xl font-bold">
                ${total.toLocaleString()}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Included in your package:</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-600">✓</span>
                  {numEvaluations} screen recording
                  {numEvaluations > 1 ? "s" : ""} of developers using your
                  product for the first time
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-600">✓</span>
                  Candid developer feedback and reactions
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-600">✓</span>
                  Findings report highlighting friction points and quick wins
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section E: Checkout CTA */}
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          size="lg"
          className="w-full text-base"
          onClick={handleCheckout}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up checkout...
            </>
          ) : (
            `Pay with Stripe — $${total.toLocaleString()}`
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Secure payment via Stripe. You&apos;ll receive recordings and feedback
          within days of payment.
        </p>
      </div>
    </div>
  );
}
