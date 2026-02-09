"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/dev/tag-input";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import {
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  frameworkOptions,
  databaseOptions,
  cloudPlatformOptions,
  devopsToolOptions,
  cicdToolOptions,
  testingFrameworkOptions,
  apiExperienceOptions,
  operatingSystemOptions,
  companySizeOptions,
  industryOptions,
  buyingInfluenceOptions,
  paidToolOptions,
  ossActivityOptions,
} from "@/lib/admin/filter-options";
import { createProject, createCheckoutSession } from "@/lib/company/actions";

const STEPS = [
  "Product Information",
  "Evaluation Goals",
  "Target Developer Profile",
  "Parameters & Payment",
];

const productCategoryOptions = [
  "developer-tools",
  "api-service",
  "saas-platform",
  "data-analytics",
  "security",
  "infrastructure",
  "ai-ml",
  "devops",
  "communication",
  "productivity",
  "e-commerce",
  "fintech",
  "healthtech",
  "edtech",
  "other",
];

const goalOptions = [
  { value: "messaging_validation", label: "Messaging Validation" },
  { value: "pmf_assessment", label: "PMF Assessment" },
  { value: "feature_feedback", label: "Feature Feedback" },
  { value: "documentation_review", label: "Documentation Review" },
  { value: "onboarding_flow_evaluation", label: "Onboarding Flow Evaluation" },
  { value: "dx_assessment", label: "DX Assessment" },
  { value: "competitive_comparison", label: "Competitive Comparison" },
  { value: "pricing_perception", label: "Pricing Perception" },
  { value: "api_sdk_usability", label: "API/SDK Usability" },
  { value: "time_to_first_value_measurement", label: "Time-to-First-Value Measurement" },
];

const teamSizeRangeOptions = [
  "1-5",
  "6-10",
  "11-25",
  "26-50",
  "51-100",
  "101-500",
  "500+",
];

export function ProjectWizard({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Product Information
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [evaluationScope, setEvaluationScope] = useState("");
  const [setupInstructions, setSetupInstructions] = useState("");
  const [timeToValueMilestone, setTimeToValueMilestone] = useState("");

  // Step 2: Goals
  const [goals, setGoals] = useState<string[]>([]);

  // Step 3: ICP
  const [icpRoleTypes, setIcpRoleTypes] = useState<string[]>([]);
  const [icpMinExperience, setIcpMinExperience] = useState("");
  const [icpSeniorityLevels, setIcpSeniorityLevels] = useState<string[]>([]);
  const [icpLanguages, setIcpLanguages] = useState<string[]>([]);
  const [icpFrameworks, setIcpFrameworks] = useState<string[]>([]);
  const [icpDatabases, setIcpDatabases] = useState<string[]>([]);
  const [icpCloudPlatforms, setIcpCloudPlatforms] = useState<string[]>([]);
  const [icpDevopsTools, setIcpDevopsTools] = useState<string[]>([]);
  const [icpCicdTools, setIcpCicdTools] = useState<string[]>([]);
  const [icpTestingFrameworks, setIcpTestingFrameworks] = useState<string[]>([]);
  const [icpApiExperience, setIcpApiExperience] = useState<string[]>([]);
  const [icpOperatingSystems, setIcpOperatingSystems] = useState<string[]>([]);
  const [icpCompanySizeRange, setIcpCompanySizeRange] = useState<string[]>([]);
  const [icpIndustries, setIcpIndustries] = useState<string[]>([]);
  const [icpTeamSizeRange, setIcpTeamSizeRange] = useState<string[]>([]);
  const [icpBuyingInfluence, setIcpBuyingInfluence] = useState<string[]>([]);
  const [icpPaidTools, setIcpPaidTools] = useState<string[]>([]);
  const [icpOpenSourceActivity, setIcpOpenSourceActivity] = useState<string[]>([]);

  // Step 4: Parameters
  const [numEvaluations, setNumEvaluations] = useState("5");
  const [preferredTimeline, setPreferredTimeline] = useState("");

  const pricePerEval = 399;
  const totalPrice = (parseInt(numEvaluations, 10) || 0) * pricePerEval;

  function toggleGoal(value: string) {
    setGoals((prev) =>
      prev.includes(value)
        ? prev.filter((g) => g !== value)
        : [...prev, value]
    );
  }

  function getProjectData() {
    return {
      company_id: companyId,
      product_name: productName.trim(),
      product_url: productUrl.trim() || undefined,
      product_category: productCategory || undefined,
      product_description: productDescription.trim() || undefined,
      evaluation_scope: evaluationScope.trim() || undefined,
      setup_instructions: setupInstructions.trim() || undefined,
      time_to_value_milestone: timeToValueMilestone.trim() || undefined,
      goals: goals.length > 0 ? goals : undefined,
      num_evaluations: parseInt(numEvaluations, 10) || 5,
      preferred_timeline: preferredTimeline.trim() || undefined,
      icp_role_types: icpRoleTypes.length > 0 ? icpRoleTypes : undefined,
      icp_min_experience: icpMinExperience ? parseInt(icpMinExperience, 10) : undefined,
      icp_seniority_levels: icpSeniorityLevels.length > 0 ? icpSeniorityLevels : undefined,
      icp_languages: icpLanguages.length > 0 ? icpLanguages : undefined,
      icp_frameworks: icpFrameworks.length > 0 ? icpFrameworks : undefined,
      icp_databases: icpDatabases.length > 0 ? icpDatabases : undefined,
      icp_cloud_platforms: icpCloudPlatforms.length > 0 ? icpCloudPlatforms : undefined,
      icp_devops_tools: icpDevopsTools.length > 0 ? icpDevopsTools : undefined,
      icp_cicd_tools: icpCicdTools.length > 0 ? icpCicdTools : undefined,
      icp_testing_frameworks: icpTestingFrameworks.length > 0 ? icpTestingFrameworks : undefined,
      icp_api_experience: icpApiExperience.length > 0 ? icpApiExperience : undefined,
      icp_operating_systems: icpOperatingSystems.length > 0 ? icpOperatingSystems : undefined,
      icp_company_size_range: icpCompanySizeRange.length > 0 ? icpCompanySizeRange : undefined,
      icp_industries: icpIndustries.length > 0 ? icpIndustries : undefined,
      icp_team_size_range: icpTeamSizeRange.length > 0 ? icpTeamSizeRange : undefined,
      icp_buying_influence: icpBuyingInfluence.length > 0 ? icpBuyingInfluence : undefined,
      icp_paid_tools: icpPaidTools.length > 0 ? icpPaidTools : undefined,
      icp_open_source_activity: icpOpenSourceActivity.length > 0 ? icpOpenSourceActivity : undefined,
    };
  }

  async function saveAsDraft() {
    if (!productName.trim()) {
      setError("Product name is required");
      return;
    }
    setSaving(true);
    setError("");

    const result = await createProject(getProjectData());
    if (!result.success) {
      setError(result.error ?? "Failed to save project");
      setSaving(false);
      return;
    }

    router.push(`/company/projects/${result.projectId}`);
    router.refresh();
  }

  async function proceedToPayment() {
    if (!productName.trim()) {
      setError("Product name is required");
      return;
    }
    const num = parseInt(numEvaluations, 10);
    if (!num || num < 5) {
      setError("Minimum 5 evaluations required");
      return;
    }

    setSaving(true);
    setError("");

    // Save project first
    const result = await createProject(getProjectData());
    if (!result.success) {
      setError(result.error ?? "Failed to save project");
      setSaving(false);
      return;
    }

    // Create checkout session
    const checkout = await createCheckoutSession(result.projectId!);
    if (!checkout.success || !checkout.url) {
      setError(checkout.error ?? "Failed to create checkout session");
      setSaving(false);
      return;
    }

    window.location.href = checkout.url;
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Acme Developer SDK"
                />
              </div>
              <div className="space-y-2">
                <Label>Product URL</Label>
                <Input
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://docs.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Product Category</Label>
                <Select value={productCategory} onValueChange={setProductCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategoryOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {formatEnumLabel(opt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product Description</Label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Briefly describe your product and what it does..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>What to Evaluate</Label>
                <Textarea
                  value={evaluationScope}
                  onChange={(e) => setEvaluationScope(e.target.value)}
                  placeholder="What specific aspects should developers evaluate?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Setup Instructions</Label>
                <Textarea
                  value={setupInstructions}
                  onChange={(e) => setSetupInstructions(e.target.value)}
                  placeholder="How should developers get started with your product?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Time-to-Value Milestone</Label>
                <Textarea
                  value={timeToValueMilestone}
                  onChange={(e) => setTimeToValueMilestone(e.target.value)}
                  placeholder="What should developers try to accomplish during the evaluation?"
                  rows={2}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Select the goals for this evaluation project. What do you want to
                learn from developers?
              </p>
              <div className="grid gap-3">
                {goalOptions.map((goal) => (
                  <label
                    key={goal.value}
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={goals.includes(goal.value)}
                      onCheckedChange={() => toggleGoal(goal.value)}
                    />
                    <span className="text-sm font-medium">{goal.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Define the ideal developer profile for your evaluation. All fields
                are optional — only fill in what matters for your product.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Role Types</Label>
                  <TagInput
                    label="Role Types"
                    options={roleTypeOptions}
                    selected={icpRoleTypes}
                    onChange={setIcpRoleTypes}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Years of Experience</Label>
                    <Input
                      type="number"
                      value={icpMinExperience}
                      onChange={(e) => setIcpMinExperience(e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Seniority Levels</Label>
                    <TagInput
                      label="Seniority"
                      options={[...seniorityOptions]}
                      selected={icpSeniorityLevels}
                      onChange={setIcpSeniorityLevels}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Languages</Label>
                  <TagInput
                    label="Languages"
                    options={languageOptions}
                    selected={icpLanguages}
                    onChange={setIcpLanguages}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frameworks</Label>
                  <TagInput
                    label="Frameworks"
                    options={frameworkOptions}
                    selected={icpFrameworks}
                    onChange={setIcpFrameworks}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Databases</Label>
                  <TagInput
                    label="Databases"
                    options={databaseOptions}
                    selected={icpDatabases}
                    onChange={setIcpDatabases}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cloud Platforms</Label>
                  <TagInput
                    label="Cloud Platforms"
                    options={cloudPlatformOptions}
                    selected={icpCloudPlatforms}
                    onChange={setIcpCloudPlatforms}
                  />
                </div>
                <div className="space-y-2">
                  <Label>DevOps Tools</Label>
                  <TagInput
                    label="DevOps Tools"
                    options={devopsToolOptions}
                    selected={icpDevopsTools}
                    onChange={setIcpDevopsTools}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CI/CD Tools</Label>
                  <TagInput
                    label="CI/CD Tools"
                    options={cicdToolOptions}
                    selected={icpCicdTools}
                    onChange={setIcpCicdTools}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Testing Frameworks</Label>
                  <TagInput
                    label="Testing Frameworks"
                    options={testingFrameworkOptions}
                    selected={icpTestingFrameworks}
                    onChange={setIcpTestingFrameworks}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Experience</Label>
                  <TagInput
                    label="API Experience"
                    options={apiExperienceOptions}
                    selected={icpApiExperience}
                    onChange={setIcpApiExperience}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Operating Systems</Label>
                  <TagInput
                    label="Operating Systems"
                    options={operatingSystemOptions}
                    selected={icpOperatingSystems}
                    onChange={setIcpOperatingSystems}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Size Range</Label>
                  <TagInput
                    label="Company Size"
                    options={[...companySizeOptions]}
                    selected={icpCompanySizeRange}
                    onChange={setIcpCompanySizeRange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industries</Label>
                  <TagInput
                    label="Industries"
                    options={industryOptions}
                    selected={icpIndustries}
                    onChange={setIcpIndustries}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Team Size Range</Label>
                  <TagInput
                    label="Team Size"
                    options={teamSizeRangeOptions}
                    selected={icpTeamSizeRange}
                    onChange={setIcpTeamSizeRange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buying Influence</Label>
                  <TagInput
                    label="Buying Influence"
                    options={[...buyingInfluenceOptions]}
                    selected={icpBuyingInfluence}
                    onChange={setIcpBuyingInfluence}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paid Tools</Label>
                  <TagInput
                    label="Paid Tools"
                    options={paidToolOptions}
                    selected={icpPaidTools}
                    onChange={setIcpPaidTools}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Open Source Activity</Label>
                  <TagInput
                    label="Open Source Activity"
                    options={[...ossActivityOptions]}
                    selected={icpOpenSourceActivity}
                    onChange={setIcpOpenSourceActivity}
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>
                  Number of Evaluations <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={5}
                  value={numEvaluations}
                  onChange={(e) => setNumEvaluations(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 5 evaluations per project
                </p>
              </div>
              <div className="space-y-2">
                <Label>Preferred Timeline</Label>
                <Input
                  value={preferredTimeline}
                  onChange={(e) => setPreferredTimeline(e.target.value)}
                  placeholder="e.g. Within 2 weeks"
                />
              </div>

              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h3 className="font-medium">Price Summary</h3>
                <div className="flex justify-between text-sm">
                  <span>{parseInt(numEvaluations, 10) || 0} evaluations</span>
                  <span>x $399 each</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                  <span>Total</span>
                  <span>${totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => { setStep(step - 1); setError(""); }}
          disabled={step === 0}
        >
          Back
        </Button>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button onClick={() => { setStep(step + 1); setError(""); }}>
              Continue
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={saveAsDraft}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save as Draft"}
              </Button>
              <Button onClick={proceedToPayment} disabled={saving}>
                {saving ? "Processing..." : "Proceed to Payment"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
