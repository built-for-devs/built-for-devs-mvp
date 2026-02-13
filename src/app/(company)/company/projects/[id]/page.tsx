import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyForUser, getCompanyProject } from "@/lib/company/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import { CopyButton } from "./evaluations/[evalId]/copy-button";
import { CheckoutButton } from "./checkout-button";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending_payment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  matching: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  evaluations_complete: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  report_drafting: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const statusMessages: Record<string, string> = {
  draft: "This project is saved as a draft. Proceed to payment to get started.",
  paid: "Paid! We're matching you with developers.",
  matching: "We're matching you with developers.",
  in_progress: "Evaluations are in progress.",
  evaluations_complete: "All evaluations are complete. Report is being prepared.",
  report_drafting: "Your findings report is being drafted.",
  delivered: "Your findings report has been delivered.",
  closed: "This project is closed.",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = await params;
  const { payment } = await searchParams;
  const supabase = await createClient();
  const companyData = await getCompanyForUser(supabase);

  if (!companyData) redirect("/company/onboarding");

  const result = await getCompanyProject(supabase, id);
  if (!result) notFound();

  const { project, evaluations } = result;
  const completedCount = evaluations.filter((e) =>
    ["approved", "paid"].includes(e.status ?? "")
  ).length;

  // Collect ICP fields for display
  const icpFields: { label: string; values: string[] }[] = [];
  const icpMap: Record<string, string[] | null> = {
    "Role Types": project.icp_role_types,
    "Seniority Levels": project.icp_seniority_levels,
    "Languages": project.icp_languages,
    "Frameworks": project.icp_frameworks,
    "Databases": project.icp_databases,
    "Cloud Platforms": project.icp_cloud_platforms,
    "DevOps Tools": project.icp_devops_tools,
    "CI/CD Tools": project.icp_cicd_tools,
    "Testing Frameworks": project.icp_testing_frameworks,
    "API Experience": project.icp_api_experience,
    "Operating Systems": project.icp_operating_systems,
    "Company Size": project.icp_company_size_range,
    "Industries": project.icp_industries,
    "Team Size": project.icp_team_size_range,
    "Buying Influence": project.icp_buying_influence,
    "Paid Tools": project.icp_paid_tools,
    "Open Source Activity": project.icp_open_source_activity,
  };
  for (const [label, values] of Object.entries(icpMap)) {
    if (values && values.length > 0) {
      icpFields.push({ label, values });
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment notification */}
      {payment === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
          Payment successful! We&apos;ll start matching you with developers shortly.
        </div>
      )}
      {payment === "cancelled" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Payment was cancelled. You can proceed to payment whenever you&apos;re ready.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.product_name}</h1>
            <Badge
              variant="secondary"
              className={statusColors[project.status] ?? ""}
            >
              {formatEnumLabel(project.status)}
            </Badge>
          </div>
          {project.product_category && (
            <p className="mt-1 text-muted-foreground">
              {formatEnumLabel(project.product_category)}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Created {new Date(project.created_at).toLocaleDateString()}
          </p>
        </div>
        {project.status === "draft" && (
          <CheckoutButton projectId={project.id} />
        )}
      </div>

      {/* Status message */}
      {statusMessages[project.status] && (
        <p className="text-muted-foreground">{statusMessages[project.status]}</p>
      )}

      {/* Product details */}
      {project.product_description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{project.product_description}</p>
          </CardContent>
        </Card>
      )}

      {/* ICP Summary */}
      {icpFields.length > 0 && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Target Developer Profile</CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                {project.icp_min_experience && (
                  <div>
                    <span className="text-sm font-medium">Min Experience: </span>
                    <span className="text-sm text-muted-foreground">
                      {project.icp_min_experience} years
                    </span>
                  </div>
                )}
                {icpFields.map((field) => (
                  <div key={field.label}>
                    <span className="text-sm font-medium">{field.label}: </span>
                    <span className="text-sm text-muted-foreground">
                      {field.values.map((v) => formatEnumLabel(v)).join(", ")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Evaluation Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluation Progress</CardTitle>
          <CardDescription>
            {completedCount} of {project.num_evaluations} evaluations complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-3 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${(completedCount / project.num_evaluations) * 100}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Evaluations List */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evaluations.map((evaluation) => (
                <Link
                  key={evaluation.id}
                  href={`/company/projects/${project.id}/evaluations/${evaluation.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {evaluation.anonymous_descriptor || "Anonymous Developer"}
                    </p>
                    {evaluation.recording_completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Completed{" "}
                        {new Date(evaluation.recording_completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={statusColors[evaluation.status ?? ""] ?? ""}
                  >
                    {formatEnumLabel(evaluation.status ?? "unknown")}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings Report */}
      {project.report_published && project.findings_report && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Findings Report</CardTitle>
            <CopyButton text={project.findings_report} label="Copy Report" />
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {project.findings_report}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
