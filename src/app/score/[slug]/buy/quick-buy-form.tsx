"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/components/dev/tag-input";
import {
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  frameworkOptions,
  databaseOptions,
  cloudPlatformOptions,
  industryOptions,
  devopsToolOptions,
  cicdToolOptions,
  testingFrameworkOptions,
  apiExperienceOptions,
  operatingSystemOptions,
  companySizeOptions,
  buyingInfluenceOptions,
  paidToolOptions,
  ossActivityOptions,
  formatEnumLabel,
} from "@/lib/admin/filter-options";
import {
  classificationStyles,
  classificationLabels,
} from "@/lib/score/classification";
import type { Classification } from "@/lib/score/types";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  Users,
} from "lucide-react";

interface QuickBuyFormProps {
  slug: string;
  productName: string;
  targetUrl: string;
  finalScore: number;
  classification: string;
}

interface MatchPreviewResult {
  totalMatches: number;
  samples: {
    descriptor: string;
    experience: string;
    topSkills: string[];
    seniority: string;
  }[];
}

export function QuickBuyForm({
  slug,
  productName,
  targetUrl,
  finalScore,
  classification,
}: QuickBuyFormProps) {
  // ICP state
  const [roleTypes, setRoleTypes] = useState<string[]>([]);
  const [seniorityLevels, setSeniorityLevels] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [cloudPlatforms, setCloudPlatforms] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [devopsTools, setDevopsTools] = useState<string[]>([]);
  const [cicdTools, setCicdTools] = useState<string[]>([]);
  const [testingFrameworks, setTestingFrameworks] = useState<string[]>([]);
  const [apiExperience, setApiExperience] = useState<string[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState<string[]>([]);
  const [buyingInfluence, setBuyingInfluence] = useState<string[]>([]);
  const [paidTools, setPaidTools] = useState<string[]>([]);
  const [ossActivity, setOssActivity] = useState<string[]>([]);

  // UI state
  const [showRefinement, setShowRefinement] = useState(false);
  const [numEvaluations, setNumEvaluations] = useState(3);
  const [matchPreview, setMatchPreview] = useState<MatchPreviewResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cls = classification as Classification;
  const pricePerEval = 399;
  const total = numEvaluations * pricePerEval;

  // Fetch developer match preview
  const fetchMatchPreview = useCallback(async () => {
    const hasAnyFilter =
      roleTypes.length > 0 ||
      seniorityLevels.length > 0 ||
      languages.length > 0 ||
      minExperience > 0 ||
      frameworks.length > 0 ||
      databases.length > 0 ||
      cloudPlatforms.length > 0 ||
      industries.length > 0 ||
      devopsTools.length > 0 ||
      cicdTools.length > 0 ||
      testingFrameworks.length > 0 ||
      apiExperience.length > 0 ||
      operatingSystems.length > 0 ||
      companySize.length > 0 ||
      buyingInfluence.length > 0 ||
      paidTools.length > 0 ||
      ossActivity.length > 0;

    if (!hasAnyFilter) {
      setMatchPreview(null);
      return;
    }

    setMatchLoading(true);
    try {
      const res = await fetch(`/api/score/${slug}/match-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_types: roleTypes.length ? roleTypes : undefined,
          seniority_levels: seniorityLevels.length ? seniorityLevels : undefined,
          languages: languages.length ? languages : undefined,
          min_experience: minExperience > 0 ? minExperience : undefined,
          frameworks: frameworks.length ? frameworks : undefined,
          databases: databases.length ? databases : undefined,
          cloud_platforms: cloudPlatforms.length ? cloudPlatforms : undefined,
          industries: industries.length ? industries : undefined,
          devops_tools: devopsTools.length ? devopsTools : undefined,
          cicd_tools: cicdTools.length ? cicdTools : undefined,
          testing_frameworks: testingFrameworks.length ? testingFrameworks : undefined,
          api_experience: apiExperience.length ? apiExperience : undefined,
          operating_systems: operatingSystems.length ? operatingSystems : undefined,
          company_size: companySize.length ? companySize : undefined,
          buying_influence: buyingInfluence.length ? buyingInfluence : undefined,
          paid_tools: paidTools.length ? paidTools : undefined,
          open_source_activity: ossActivity.length ? ossActivity : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatchPreview(data);
      }
    } catch {
      // Silently fail — preview is non-critical
    } finally {
      setMatchLoading(false);
    }
  }, [slug, roleTypes, seniorityLevels, languages, minExperience, frameworks, databases, cloudPlatforms, industries, devopsTools, cicdTools, testingFrameworks, apiExperience, operatingSystems, companySize, buyingInfluence, paidTools, ossActivity]);

  // Debounced match preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchMatchPreview, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchMatchPreview]);

  // Handle checkout
  async function handleCheckout() {
    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/score/${slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp: {
            role_types: roleTypes.length ? roleTypes : undefined,
            seniority_levels: seniorityLevels.length ? seniorityLevels : undefined,
            languages: languages.length ? languages : undefined,
            min_experience: minExperience > 0 ? minExperience : undefined,
            frameworks: frameworks.length ? frameworks : undefined,
            databases: databases.length ? databases : undefined,
            cloud_platforms: cloudPlatforms.length ? cloudPlatforms : undefined,
            industries: industries.length ? industries : undefined,
            devops_tools: devopsTools.length ? devopsTools : undefined,
            cicd_tools: cicdTools.length ? cicdTools : undefined,
            testing_frameworks: testingFrameworks.length ? testingFrameworks : undefined,
            api_experience: apiExperience.length ? apiExperience : undefined,
            operating_systems: operatingSystems.length ? operatingSystems : undefined,
            company_size: companySize.length ? companySize : undefined,
            buying_influence: buyingInfluence.length ? buyingInfluence : undefined,
            paid_tools: paidTools.length ? paidTools : undefined,
            open_source_activity: ossActivity.length ? ossActivity : undefined,
          },
          num_evaluations: numEvaluations,
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

  return (
    <div className="space-y-10">
      {/* Section A: Product Context */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">
          Get real developer feedback for {productName}
        </h1>
        <p className="text-muted-foreground">
          Your score tells you what&apos;s visible from the outside. Developer
          evaluations reveal what happens when real developers actually try your
          product.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className={classificationStyles[cls]}
          >
            Score: {finalScore}/120 — {classificationLabels[cls]}
          </Badge>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {targetUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <Separator />

      {/* Section B: ICP Selection */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">
            Define your target developer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us who should evaluate your product. We&apos;ll match
            developers from our network who fit your criteria.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Role Types</Label>
            <TagInput
              label="Role Types"
              options={roleTypeOptions}
              selected={roleTypes}
              onChange={setRoleTypes}
              placeholder="e.g. Backend, Full-Stack..."
            />
          </div>

          <div className="space-y-2">
            <Label>Seniority Levels</Label>
            <TagInput
              label="Seniority"
              options={[...seniorityOptions]}
              selected={seniorityLevels}
              onChange={setSeniorityLevels}
              placeholder="e.g. Senior, Staff..."
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Languages</Label>
            <TagInput
              label="Languages"
              options={languageOptions}
              selected={languages}
              onChange={setLanguages}
              placeholder="e.g. Python, TypeScript..."
            />
          </div>

          <div className="space-y-2">
            <Label>Min. Years Experience</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={minExperience || ""}
              onChange={(e) =>
                setMinExperience(parseInt(e.target.value) || 0)
              }
              placeholder="0"
            />
          </div>
        </div>

        {/* Collapsible refinement */}
        <button
          type="button"
          onClick={() => setShowRefinement(!showRefinement)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showRefinement ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {showRefinement ? "Hide" : "Refine further"} (frameworks, buying
          influence, tools, and more)
        </button>

        {showRefinement && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Frameworks</Label>
              <TagInput
                label="Frameworks"
                options={frameworkOptions}
                selected={frameworks}
                onChange={setFrameworks}
                placeholder="e.g. React, Django..."
              />
            </div>
            <div className="space-y-2">
              <Label>Databases</Label>
              <TagInput
                label="Databases"
                options={databaseOptions}
                selected={databases}
                onChange={setDatabases}
                placeholder="e.g. PostgreSQL, Redis..."
              />
            </div>
            <div className="space-y-2">
              <Label>Cloud Platforms</Label>
              <TagInput
                label="Cloud Platforms"
                options={cloudPlatformOptions}
                selected={cloudPlatforms}
                onChange={setCloudPlatforms}
                placeholder="e.g. AWS, GCP..."
              />
            </div>
            <div className="space-y-2">
              <Label>Industries</Label>
              <TagInput
                label="Industries"
                options={industryOptions}
                selected={industries}
                onChange={setIndustries}
                placeholder="e.g. SaaS, FinTech..."
              />
            </div>
            <div className="space-y-2">
              <Label>Buying Influence</Label>
              <TagInput
                label="Buying Influence"
                options={[...buyingInfluenceOptions]}
                selected={buyingInfluence}
                onChange={setBuyingInfluence}
                placeholder="e.g. Decision Maker..."
              />
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <TagInput
                label="Company Size"
                options={[...companySizeOptions]}
                selected={companySize}
                onChange={setCompanySize}
                placeholder="e.g. 11-50, 51-200..."
              />
            </div>
            <div className="space-y-2">
              <Label>DevOps Tools</Label>
              <TagInput
                label="DevOps Tools"
                options={devopsToolOptions}
                selected={devopsTools}
                onChange={setDevopsTools}
                placeholder="e.g. Docker, Kubernetes..."
              />
            </div>
            <div className="space-y-2">
              <Label>CI/CD Tools</Label>
              <TagInput
                label="CI/CD Tools"
                options={cicdToolOptions}
                selected={cicdTools}
                onChange={setCicdTools}
                placeholder="e.g. GitHub Actions..."
              />
            </div>
            <div className="space-y-2">
              <Label>Testing Frameworks</Label>
              <TagInput
                label="Testing Frameworks"
                options={testingFrameworkOptions}
                selected={testingFrameworks}
                onChange={setTestingFrameworks}
                placeholder="e.g. Jest, Playwright..."
              />
            </div>
            <div className="space-y-2">
              <Label>API Experience</Label>
              <TagInput
                label="API Experience"
                options={apiExperienceOptions}
                selected={apiExperience}
                onChange={setApiExperience}
                placeholder="e.g. REST, GraphQL..."
              />
            </div>
            <div className="space-y-2">
              <Label>Operating Systems</Label>
              <TagInput
                label="Operating Systems"
                options={operatingSystemOptions}
                selected={operatingSystems}
                onChange={setOperatingSystems}
                placeholder="e.g. macOS, Linux..."
              />
            </div>
            <div className="space-y-2">
              <Label>Paid Tools</Label>
              <TagInput
                label="Paid Tools"
                options={paidToolOptions}
                selected={paidTools}
                onChange={setPaidTools}
                placeholder="e.g. GitHub, Jira..."
              />
            </div>
            <div className="space-y-2">
              <Label>Open Source Activity</Label>
              <TagInput
                label="Open Source Activity"
                options={[...ossActivityOptions]}
                selected={ossActivity}
                onChange={setOssActivity}
                placeholder="e.g. Regular, Maintainer..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Section C: Developer Preview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Matching developers</h2>

        {matchLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding matching developers...
          </div>
        ) : matchPreview ? (
          <div className="space-y-4">
            {matchPreview.totalMatches >= 3 ? (
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <Users className="h-4 w-4" />
                {matchPreview.totalMatches} developer{matchPreview.totalMatches !== 1 ? "s" : ""}{" "}
                match your criteria
              </div>
            ) : matchPreview.totalMatches > 0 ? (
              <p className="text-sm text-muted-foreground">
                We have developers who match your criteria. Consider broadening
                your filters for more options.
              </p>
            ) : (
              <p className="text-sm text-amber-600">
                No exact matches yet. Try broadening your criteria — our network
                of 6,000+ developers likely has who you need.
              </p>
            )}

            {matchPreview.samples.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matchPreview.samples.map((dev, i) => (
                  <Card key={i} className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">{dev.descriptor}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dev.experience}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dev.topSkills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select criteria above to see matching developers from our network.
          </p>
        )}
      </div>

      <Separator />

      {/* Section D: Package Selection */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Choose your package</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each evaluation includes a screen recording of a matched developer
            trying your product cold, plus their candid feedback.
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
                setNumEvaluations(Math.max(1, numEvaluations - 1))
              }
              disabled={numEvaluations <= 1}
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
          <CardContent className="p-6">
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
          </CardContent>
        </Card>
      </div>

      {/* Section E: Checkout CTA */}
      <div className="space-y-3">
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
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
            `Get Developer Feedback — $${total.toLocaleString()}`
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
