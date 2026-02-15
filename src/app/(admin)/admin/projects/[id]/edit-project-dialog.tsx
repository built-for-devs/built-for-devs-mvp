"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/lib/admin/actions";
import { MultiSelectFilter } from "@/components/admin/multi-select-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
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
  industryOptions,
  companySizeOptions,
  buyingInfluenceOptions,
  paidToolOptions,
  ossActivityOptions,
} from "@/lib/admin/filter-options";
import type { ProjectWithCompany } from "@/types/admin";

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

interface EditProjectDialogProps {
  project: ProjectWithCompany;
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [productName, setProductName] = useState(project.product_name);
  const [productDescription, setProductDescription] = useState(
    project.product_description ?? ""
  );
  const [productUrl, setProductUrl] = useState(project.product_url ?? "");
  const [productCategory, setProductCategory] = useState(
    project.product_category ?? ""
  );

  // Evaluation setup
  const [numEvaluations, setNumEvaluations] = useState(
    String(project.num_evaluations)
  );
  const [pricePerEvaluation, setPricePerEvaluation] = useState(
    String(project.price_per_evaluation)
  );
  const [evaluationScope, setEvaluationScope] = useState(
    project.evaluation_scope ?? ""
  );
  const [setupInstructions, setSetupInstructions] = useState(
    project.setup_instructions ?? ""
  );
  const [timeToValueMilestone, setTimeToValueMilestone] = useState(
    project.time_to_value_milestone ?? ""
  );
  const [goals, setGoals] = useState<string[]>(project.goals ?? []);

  // ICP criteria
  const [icpRoleTypes, setIcpRoleTypes] = useState<string[]>(project.icp_role_types ?? []);
  const [icpMinExperience, setIcpMinExperience] = useState(
    project.icp_min_experience != null ? String(project.icp_min_experience) : ""
  );
  const [icpSeniorityLevels, setIcpSeniorityLevels] = useState<string[]>(project.icp_seniority_levels ?? []);
  const [icpLanguages, setIcpLanguages] = useState<string[]>(project.icp_languages ?? []);
  const [icpFrameworks, setIcpFrameworks] = useState<string[]>(project.icp_frameworks ?? []);
  const [icpDatabases, setIcpDatabases] = useState<string[]>(project.icp_databases ?? []);
  const [icpCloudPlatforms, setIcpCloudPlatforms] = useState<string[]>(project.icp_cloud_platforms ?? []);
  const [icpDevopsTools, setIcpDevopsTools] = useState<string[]>(project.icp_devops_tools ?? []);
  const [icpCicdTools, setIcpCicdTools] = useState<string[]>(project.icp_cicd_tools ?? []);
  const [icpTestingFrameworks, setIcpTestingFrameworks] = useState<string[]>(project.icp_testing_frameworks ?? []);
  const [icpApiExperience, setIcpApiExperience] = useState<string[]>(project.icp_api_experience ?? []);
  const [icpOperatingSystems, setIcpOperatingSystems] = useState<string[]>(project.icp_operating_systems ?? []);
  const [icpCompanySizeRange, setIcpCompanySizeRange] = useState<string[]>(project.icp_company_size_range ?? []);
  const [icpIndustries, setIcpIndustries] = useState<string[]>(project.icp_industries ?? []);
  const [icpTeamSizeRange, setIcpTeamSizeRange] = useState<string[]>(project.icp_team_size_range ?? []);
  const [icpBuyingInfluence, setIcpBuyingInfluence] = useState<string[]>(project.icp_buying_influence ?? []);
  const [icpPaidTools, setIcpPaidTools] = useState<string[]>(project.icp_paid_tools ?? []);
  const [icpOpenSourceActivity, setIcpOpenSourceActivity] = useState<string[]>(project.icp_open_source_activity ?? []);

  const totalPrice =
    (parseInt(numEvaluations) || 0) * (parseFloat(pricePerEvaluation) || 0);

  function resetForm() {
    setProductName(project.product_name);
    setProductDescription(project.product_description ?? "");
    setProductUrl(project.product_url ?? "");
    setProductCategory(project.product_category ?? "");
    setNumEvaluations(String(project.num_evaluations));
    setPricePerEvaluation(String(project.price_per_evaluation));
    setEvaluationScope(project.evaluation_scope ?? "");
    setSetupInstructions(project.setup_instructions ?? "");
    setTimeToValueMilestone(project.time_to_value_milestone ?? "");
    setGoals(project.goals ?? []);
    setIcpRoleTypes(project.icp_role_types ?? []);
    setIcpMinExperience(project.icp_min_experience != null ? String(project.icp_min_experience) : "");
    setIcpSeniorityLevels(project.icp_seniority_levels ?? []);
    setIcpLanguages(project.icp_languages ?? []);
    setIcpFrameworks(project.icp_frameworks ?? []);
    setIcpDatabases(project.icp_databases ?? []);
    setIcpCloudPlatforms(project.icp_cloud_platforms ?? []);
    setIcpDevopsTools(project.icp_devops_tools ?? []);
    setIcpCicdTools(project.icp_cicd_tools ?? []);
    setIcpTestingFrameworks(project.icp_testing_frameworks ?? []);
    setIcpApiExperience(project.icp_api_experience ?? []);
    setIcpOperatingSystems(project.icp_operating_systems ?? []);
    setIcpCompanySizeRange(project.icp_company_size_range ?? []);
    setIcpIndustries(project.icp_industries ?? []);
    setIcpTeamSizeRange(project.icp_team_size_range ?? []);
    setIcpBuyingInfluence(project.icp_buying_influence ?? []);
    setIcpPaidTools(project.icp_paid_tools ?? []);
    setIcpOpenSourceActivity(project.icp_open_source_activity ?? []);
    setError(null);
  }

  function toggleGoal(value: string) {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) return;

    startTransition(async () => {
      const result = await updateProject(project.id, {
        product_name: productName.trim(),
        product_description: productDescription.trim() || undefined,
        product_url: productUrl.trim() || undefined,
        product_category: productCategory.trim() || undefined,
        num_evaluations: parseInt(numEvaluations) || project.num_evaluations,
        price_per_evaluation:
          parseFloat(pricePerEvaluation) || project.price_per_evaluation,
        evaluation_scope: evaluationScope.trim() || null,
        setup_instructions: setupInstructions.trim() || null,
        time_to_value_milestone: timeToValueMilestone.trim() || null,
        goals: goals.length > 0 ? goals : null,
        icp_role_types: icpRoleTypes.length > 0 ? icpRoleTypes : null,
        icp_min_experience: icpMinExperience ? parseInt(icpMinExperience, 10) : null,
        icp_seniority_levels: icpSeniorityLevels.length > 0 ? icpSeniorityLevels : null,
        icp_languages: icpLanguages.length > 0 ? icpLanguages : null,
        icp_frameworks: icpFrameworks.length > 0 ? icpFrameworks : null,
        icp_databases: icpDatabases.length > 0 ? icpDatabases : null,
        icp_cloud_platforms: icpCloudPlatforms.length > 0 ? icpCloudPlatforms : null,
        icp_devops_tools: icpDevopsTools.length > 0 ? icpDevopsTools : null,
        icp_cicd_tools: icpCicdTools.length > 0 ? icpCicdTools : null,
        icp_testing_frameworks: icpTestingFrameworks.length > 0 ? icpTestingFrameworks : null,
        icp_api_experience: icpApiExperience.length > 0 ? icpApiExperience : null,
        icp_operating_systems: icpOperatingSystems.length > 0 ? icpOperatingSystems : null,
        icp_company_size_range: icpCompanySizeRange.length > 0 ? icpCompanySizeRange : null,
        icp_industries: icpIndustries.length > 0 ? icpIndustries : null,
        icp_team_size_range: icpTeamSizeRange.length > 0 ? icpTeamSizeRange : null,
        icp_buying_influence: icpBuyingInfluence.length > 0 ? icpBuyingInfluence : null,
        icp_paid_tools: icpPaidTools.length > 0 ? icpPaidTools : null,
        icp_open_source_activity: icpOpenSourceActivity.length > 0 ? icpOpenSourceActivity : null,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to update project");
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* ── Basic Info ── */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Info</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-product-name">Product Name *</Label>
                <Input
                  id="edit-product-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-desc">Product Description</Label>
                <Textarea
                  id="edit-product-desc"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-product-url">Product URL</Label>
                  <Input
                    id="edit-product-url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-category">Category</Label>
                  <Input
                    id="edit-product-category"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Evaluation Setup ── */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Evaluation Setup</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-num-evals">Number of Evaluations</Label>
                  <Input
                    id="edit-num-evals"
                    type="number"
                    min="1"
                    value={numEvaluations}
                    onChange={(e) => setNumEvaluations(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price Per Evaluation ($)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerEvaluation}
                    onChange={(e) => setPricePerEvaluation(e.target.value)}
                  />
                </div>
              </div>
              {totalPrice > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-medium text-foreground">${totalPrice.toLocaleString()}</span>
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-eval-scope">Evaluation Scope</Label>
                <Textarea
                  id="edit-eval-scope"
                  value={evaluationScope}
                  onChange={(e) => setEvaluationScope(e.target.value)}
                  rows={3}
                  placeholder="What should evaluators focus on?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-setup">Setup Instructions</Label>
                <Textarea
                  id="edit-setup"
                  value={setupInstructions}
                  onChange={(e) => setSetupInstructions(e.target.value)}
                  rows={3}
                  placeholder="How should evaluators get started with the product?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ttv">Time to Value Milestone</Label>
                <Input
                  id="edit-ttv"
                  value={timeToValueMilestone}
                  onChange={(e) => setTimeToValueMilestone(e.target.value)}
                  placeholder="e.g., First successful API call"
                />
              </div>
              <div className="space-y-2">
                <Label>Goals</Label>
                <div className="grid grid-cols-2 gap-2">
                  {goalOptions.map((goal) => (
                    <label
                      key={goal.value}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={goals.includes(goal.value)}
                        onChange={() => toggleGoal(goal.value)}
                        className="rounded"
                      />
                      {goal.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* ── ICP Criteria ── */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">ICP Criteria</h3>
              <p className="text-xs text-muted-foreground">
                Define the ideal developer profile. Only fill in what matters — empty fields are ignored during matching.
              </p>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <MultiSelectFilter
                  label="Role Types"
                  options={roleTypeOptions}
                  selected={icpRoleTypes}
                  onChange={setIcpRoleTypes}
                />
                <MultiSelectFilter
                  label="Seniority"
                  options={seniorityOptions}
                  selected={icpSeniorityLevels}
                  onChange={setIcpSeniorityLevels}
                />
                <div className="space-y-2">
                  <Label htmlFor="edit-min-exp" className="text-xs">Min Experience (years)</Label>
                  <Input
                    id="edit-min-exp"
                    type="number"
                    min="0"
                    value={icpMinExperience}
                    onChange={(e) => setIcpMinExperience(e.target.value)}
                    placeholder="e.g., 3"
                  />
                </div>
                <MultiSelectFilter
                  label="Languages"
                  options={languageOptions}
                  selected={icpLanguages}
                  onChange={setIcpLanguages}
                />
                <MultiSelectFilter
                  label="Frameworks"
                  options={frameworkOptions}
                  selected={icpFrameworks}
                  onChange={setIcpFrameworks}
                />
                <MultiSelectFilter
                  label="Databases"
                  options={databaseOptions}
                  selected={icpDatabases}
                  onChange={setIcpDatabases}
                />
                <MultiSelectFilter
                  label="Cloud Platforms"
                  options={cloudPlatformOptions}
                  selected={icpCloudPlatforms}
                  onChange={setIcpCloudPlatforms}
                />
                <MultiSelectFilter
                  label="DevOps Tools"
                  options={devopsToolOptions}
                  selected={icpDevopsTools}
                  onChange={setIcpDevopsTools}
                />
                <MultiSelectFilter
                  label="CI/CD Tools"
                  options={cicdToolOptions}
                  selected={icpCicdTools}
                  onChange={setIcpCicdTools}
                />
                <MultiSelectFilter
                  label="Testing"
                  options={testingFrameworkOptions}
                  selected={icpTestingFrameworks}
                  onChange={setIcpTestingFrameworks}
                />
                <MultiSelectFilter
                  label="API Experience"
                  options={apiExperienceOptions}
                  selected={icpApiExperience}
                  onChange={setIcpApiExperience}
                />
                <MultiSelectFilter
                  label="Operating Systems"
                  options={operatingSystemOptions}
                  selected={icpOperatingSystems}
                  onChange={setIcpOperatingSystems}
                />
                <MultiSelectFilter
                  label="Industries"
                  options={industryOptions}
                  selected={icpIndustries}
                  onChange={setIcpIndustries}
                />
                <MultiSelectFilter
                  label="Company Size"
                  options={companySizeOptions}
                  selected={icpCompanySizeRange}
                  onChange={setIcpCompanySizeRange}
                />
                <MultiSelectFilter
                  label="Team Size"
                  options={teamSizeRangeOptions}
                  selected={icpTeamSizeRange}
                  onChange={setIcpTeamSizeRange}
                />
                <MultiSelectFilter
                  label="Buying Influence"
                  options={buyingInfluenceOptions}
                  selected={icpBuyingInfluence}
                  onChange={setIcpBuyingInfluence}
                />
                <MultiSelectFilter
                  label="Paid Tools"
                  options={paidToolOptions}
                  selected={icpPaidTools}
                  onChange={setIcpPaidTools}
                />
                <MultiSelectFilter
                  label="Open Source"
                  options={ossActivityOptions}
                  selected={icpOpenSourceActivity}
                  onChange={setIcpOpenSourceActivity}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !productName.trim()}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
