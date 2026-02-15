import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectById, getMatchCandidates } from "@/lib/admin/queries";
import { scoreAndRankDevelopers } from "@/lib/admin/icp-matching";
import { RecommendedMatches } from "./recommended-matches";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectActions } from "./project-actions";
import { EditProjectDialog } from "./edit-project-dialog";
import { DeleteProjectButton } from "./delete-project-button";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await getProjectById(supabase, id);

  if (!result) notFound();

  const { project, evaluations } = result;
  const approvedEvals = evaluations.filter((e) => e.status === "approved");
  const paidEvals = evaluations.filter((e) => e.status === "paid");

  // ICP-based developer matching
  const candidates = await getMatchCandidates(supabase);
  const excludeIds = new Set(evaluations.map((e) => e.developers.id));
  const matches = scoreAndRankDevelopers(project, candidates, excludeIds, 20);

  // ICP criteria — show only non-empty fields
  const icpFields: { label: string; value: string[] | number | null }[] = [
    { label: "Role Types", value: project.icp_role_types },
    { label: "Min Experience", value: project.icp_min_experience },
    { label: "Seniority Levels", value: project.icp_seniority_levels },
    { label: "Languages", value: project.icp_languages },
    { label: "Frameworks", value: project.icp_frameworks },
    { label: "Databases", value: project.icp_databases },
    { label: "Cloud Platforms", value: project.icp_cloud_platforms },
    { label: "DevOps Tools", value: project.icp_devops_tools },
    { label: "CI/CD Tools", value: project.icp_cicd_tools },
    { label: "Testing Frameworks", value: project.icp_testing_frameworks },
    { label: "API Experience", value: project.icp_api_experience },
    { label: "Operating Systems", value: project.icp_operating_systems },
    { label: "Company Size", value: project.icp_company_size_range },
    { label: "Industries", value: project.icp_industries },
    { label: "Team Size", value: project.icp_team_size_range },
    { label: "Buying Influence", value: project.icp_buying_influence },
    { label: "Paid Tools", value: project.icp_paid_tools },
    { label: "Open Source", value: project.icp_open_source_activity },
  ].filter((f) => {
    if (Array.isArray(f.value)) return f.value.length > 0;
    return f.value != null;
  });

  return (
    <div className="space-y-8">
      <PageHeader title={project.product_name}>
        <EditProjectDialog project={project} />
        <DeleteProjectButton projectId={project.id} projectName={project.product_name} />
        <StatusBadge status={project.status} type="project" />
      </PageHeader>

      {/* ===== PROJECT INFO ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Company</dt>
              <dd className="text-sm">
                <Link href={`/admin/companies/${project.company_id}`} className="hover:underline">
                  {project.companies.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Product URL</dt>
              <dd className="text-sm">
                {project.product_url ? (
                  <a href={project.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {project.product_url}
                  </a>
                ) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Category</dt>
              <dd className="text-sm">{project.product_category ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium text-muted-foreground">Description</dt>
              <dd className="text-sm whitespace-pre-wrap">{project.product_description ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium text-muted-foreground">Evaluation Scope</dt>
              <dd className="text-sm whitespace-pre-wrap">{project.evaluation_scope ?? "—"}</dd>
            </div>
            {project.setup_instructions && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium text-muted-foreground">Setup Instructions</dt>
                <dd className="text-sm whitespace-pre-wrap">{project.setup_instructions}</dd>
              </div>
            )}
            {project.time_to_value_milestone && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium text-muted-foreground">Time to Value Milestone</dt>
                <dd className="text-sm">{project.time_to_value_milestone}</dd>
              </div>
            )}
          </dl>

          {/* Goals */}
          {project.goals && project.goals.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Goals</p>
              <div className="flex flex-wrap gap-1">
                {project.goals.map((goal) => (
                  <Badge key={goal} variant="secondary" className="text-xs">
                    {formatEnumLabel(goal)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* ICP Criteria */}
          {icpFields.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-3 text-sm font-medium">ICP Criteria</p>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {icpFields.map((field) => (
                    <div key={field.label}>
                      <dt className="text-xs text-muted-foreground">{field.label}</dt>
                      <dd className="mt-1">
                        {Array.isArray(field.value) ? (
                          <div className="flex flex-wrap gap-1">
                            {field.value.map((v) => (
                              <Badge key={v} variant="outline" className="text-xs">
                                {formatEnumLabel(v)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm">{field.value} years</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}

          <Separator />

          {/* Pricing */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Evaluations</dt>
              <dd className="text-sm">{project.num_evaluations}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Price Per Eval</dt>
              <dd className="text-sm">${project.price_per_evaluation}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Total Price</dt>
              <dd className="text-sm font-medium">${project.total_price ?? 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ===== RECOMMENDED DEVELOPERS ===== */}
      <RecommendedMatches
        matches={matches}
        projectId={project.id}
        hasIcpCriteria={icpFields.length > 0}
      />

      {/* ===== INTERACTIVE SECTIONS (Client) ===== */}
      <ProjectActions
        project={project}
        evaluations={evaluations}
        approvedEvals={approvedEvals}
        paidEvals={paidEvals}
      />
    </div>
  );
}
