"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Minus, Plus } from "lucide-react";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import type { IcpCriteria } from "@/types/icp";
import { ICP_CRITERIA_KEYS } from "@/types/icp";

// Values match the goals column on the projects table
const goalOptions = [
  { value: "messaging_validation", label: "Messaging validation" },
  { value: "pmf_assessment", label: "Product-market fit assessment" },
  { value: "feature_feedback", label: "Feature feedback" },
  { value: "documentation_review", label: "Documentation review" },
  { value: "onboarding_flow_evaluation", label: "Onboarding flow evaluation" },
  { value: "dx_assessment", label: "Developer experience assessment" },
  { value: "competitive_comparison", label: "Competitive comparison" },
  { value: "pricing_perception", label: "Pricing perception" },
  { value: "api_sdk_usability", label: "API/SDK usability" },
  { value: "time_to_first_value_measurement", label: "Time-to-first-value measurement" },
];

// Labels for displaying ICP criteria
const criteriaLabels: Record<keyof IcpCriteria, string> = {
  role_types: "Role Types",
  seniority: "Seniority",
  languages: "Languages",
  frameworks: "Frameworks",
  databases: "Databases",
  cloud_platforms: "Cloud Platforms",
  devops_tools: "DevOps Tools",
  cicd_tools: "CI/CD Tools",
  testing_frameworks: "Testing Frameworks",
  api_experience: "API Experience",
  operating_systems: "Operating Systems",
  industries: "Industries",
  company_size: "Company Size",
  buying_influence: "Buying Influence",
  paid_tools: "Paid Tools",
  open_source_activity: "Open Source Activity",
};

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

type CheckoutMode = "icp" | "profiles";

export function CheckoutForm() {
  const router = useRouter();

  // Data from localStorage
  const [mode, setMode] = useState<CheckoutMode | null>(null);
  const [icpCriteria, setIcpCriteria] = useState<IcpCriteria | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<SelectedProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [numEvaluations, setNumEvaluations] = useState(10);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricePerEval = 399;
  const total = numEvaluations * pricePerEval;

  // Load data from localStorage — prefer ICP criteria over profiles
  useEffect(() => {
    // Try ICP criteria first (new wizard flow)
    const storedCriteria = localStorage.getItem("bfd_icp_criteria");
    if (storedCriteria) {
      try {
        const parsed = JSON.parse(storedCriteria) as IcpCriteria;
        const hasAnyCriteria = ICP_CRITERIA_KEYS.some(
          (k) => Array.isArray(parsed[k]) && parsed[k].length > 0
        );
        if (hasAnyCriteria) {
          setIcpCriteria(parsed);
          setMode("icp");

          // Pre-fill from wizard localStorage
          const desc = localStorage.getItem("bfd_product_description");
          if (desc) setProductDescription(desc);
          const storedUrl = localStorage.getItem("bfd_product_url");
          if (storedUrl) setProductUrl(storedUrl);

          setLoaded(true);
          return;
        }
      } catch {
        // Invalid JSON — fall through
      }
    }

    // Fall back to selected profiles (old flow)
    const storedProfiles = localStorage.getItem("bfd_selected_profiles");
    if (storedProfiles) {
      try {
        const parsed = JSON.parse(storedProfiles) as SelectedProfile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles(parsed);
          setMode("profiles");
          setNumEvaluations(Math.max(3, parsed.length));
          setLoaded(true);
          return;
        }
      } catch {
        // Invalid JSON — fall through
      }
    }

    // No valid data — redirect to homepage
    router.replace("/");
  }, [router]);

  // Get populated ICP criteria for display
  const populatedCriteria = icpCriteria
    ? ICP_CRITERIA_KEYS.filter((k) => icpCriteria[k].length > 0)
    : [];

  async function handleCheckout() {
    setCheckoutLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        productName: productName.trim(),
        productUrl: productUrl.trim(),
        productDescription: productDescription.trim() || undefined,
        email: email.trim(),
        contactName: contactName.trim(),
        companyName: companyName.trim(),
        numEvaluations,
      };

      if (mode === "icp") {
        body.icpCriteria = icpCriteria;
        if (goals.length > 0) body.goals = goals;
      } else {
        body.selectedProfiles = profiles;
      }

      const res = await fetch("/api/buy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      {/* Section A: Developer Criteria or Selected Profiles */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">
            Your developer criteria
          </h1>
          {mode === "icp" ? (
            <p className="mt-1 text-muted-foreground">
              These are the criteria you selected. We&apos;ll use them to match the best developers from our network to evaluate your product.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              You&apos;ve selected {profiles.length} developer profile
              {profiles.length !== 1 ? "s" : ""}. We&apos;ll match developers
              like these from our network to evaluate your product.
            </p>
          )}
        </div>

        {mode === "icp" && icpCriteria ? (
          /* ICP criteria display as badge groups */
          <div className="rounded-md border p-4 space-y-3">
            {populatedCriteria.map((key) => (
              <div key={key}>
                <span className="text-xs font-medium text-muted-foreground">
                  {criteriaLabels[key]}
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {icpCriteria[key].map((value) => (
                    <Badge key={value} variant="secondary" className="text-xs font-normal">
                      {formatEnumLabel(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Legacy profiles table */
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Title</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seniority</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frameworks</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((dev, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{dev.jobTitle ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{dev.seniority ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {dev.languages.length > 0
                          ? dev.languages.slice(0, 3).map((l) => (
                              <Badge key={l} variant="secondary" className="text-xs font-normal">{l}</Badge>
                            ))
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {dev.frameworks.length > 0
                          ? dev.frameworks.slice(0, 3).map((f) => (
                              <Badge key={f} variant="secondary" className="text-xs font-normal">{f}</Badge>
                            ))
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{dev.country ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Section B2: Evaluation Goals */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">What do you want to learn?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select what matters most — this helps us tailor your findings report.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {goalOptions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                goals.includes(option.value)
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Checkbox
                checked={goals.includes(option.value)}
                onCheckedChange={(checked) => {
                  setGoals((prev) =>
                    checked
                      ? [...prev, option.value]
                      : prev.filter((v) => v !== option.value)
                  );
                }}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug">{option.label}</span>
            </label>
          ))}
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
