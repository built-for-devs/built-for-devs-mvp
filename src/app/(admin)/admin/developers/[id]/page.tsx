import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeveloperById } from "@/lib/admin/queries";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeveloperAdminPanel } from "./admin-panel";
import { EditDeveloperDialog } from "./edit-developer-dialog";
import { ProjectPickerDialog } from "@/components/admin/project-picker-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AdminDeveloperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await getDeveloperById(supabase, id);

  if (!result) notFound();

  const { developer: dev, evaluations } = result;

  // Evaluation stats
  const statusCounts: Record<string, number> = {};
  const existingProjectIds: string[] = [];
  for (const ev of evaluations) {
    statusCounts[ev.status] = (statusCounts[ev.status] ?? 0) + 1;
    existingProjectIds.push(ev.project_id);
  }

  return (
    <div>
      <PageHeader
        title={dev.profiles.full_name}
        description={dev.profiles.email}
      >
        <div className="flex gap-2">
          <ProjectPickerDialog developerId={dev.id} existingProjectIds={existingProjectIds} />
          <EditDeveloperDialog developer={dev} />
        </div>
      </PageHeader>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="stats">Stats & History</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        {/* ===== PROFILE TAB ===== */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          {/* Professional Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Professional Identity</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Job Title" value={dev.job_title} />
                <Field label="Role Types" value={dev.role_types} />
                <Field label="Seniority" value={dev.seniority ? formatEnumLabel(dev.seniority) : null} />
                <Field label="Years Experience" value={dev.years_experience != null ? `${dev.years_experience}` : null} />
                <Field label="Current Company" value={dev.current_company} />
                <Field label="Company Size" value={dev.company_size ? formatEnumLabel(dev.company_size) : null} />
                <Field label="Industries" value={dev.industries} />
              </dl>
            </CardContent>
          </Card>

          {/* Technical Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technical Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Languages" value={dev.languages} />
                <Field label="Frameworks" value={dev.frameworks} />
                <Field label="Databases" value={dev.databases} />
                <Field label="Cloud Platforms" value={dev.cloud_platforms} />
                <Field label="DevOps Tools" value={dev.devops_tools} />
                <Field label="CI/CD Tools" value={dev.cicd_tools} />
                <Field label="Testing" value={dev.testing_frameworks} />
                <Field label="API Experience" value={dev.api_experience} />
                <Field label="Operating Systems" value={dev.operating_systems} />
              </dl>
            </CardContent>
          </Card>

          {/* Development Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Development Context</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Team Size" value={dev.team_size != null ? `${dev.team_size}` : null} />
                <Field label="Buying Influence" value={dev.buying_influence ? formatEnumLabel(dev.buying_influence) : null} />
                <Field label="Paid Tools" value={dev.paid_tools} />
                <Field label="Open Source" value={dev.open_source_activity ? formatEnumLabel(dev.open_source_activity) : null} />
              </dl>
            </CardContent>
          </Card>

          {/* Online Profiles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Online Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LinkField label="LinkedIn" value={dev.linkedin_url} />
                <LinkField label="GitHub" value={dev.github_url} />
                <LinkField label="Twitter" value={dev.twitter_url} />
                <LinkField label="Website" value={dev.website_url} />
              </dl>
            </CardContent>
          </Card>

          {/* Demographics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demographics & Logistics</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Country" value={dev.country} />
                <Field label="State/Region" value={dev.state_region} />
                <Field label="Timezone" value={dev.timezone} />
                <Field label="Preferred Eval Times" value={dev.preferred_eval_times} />
                <Field label="PayPal Email" value={dev.paypal_email} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== STATS TAB ===== */}
        <TabsContent value="stats" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Evaluations</p>
                <p className="text-2xl font-semibold">{dev.total_evaluations}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-semibold">
                  {dev.response_rate != null ? `${(dev.response_rate * 100).toFixed(0)}%` : "N/A"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Quality Rating</p>
                <p className="text-2xl font-semibold">
                  {dev.quality_rating != null ? dev.quality_rating.toFixed(2) : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status breakdown */}
          {Object.keys(statusCounts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evaluation Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <StatusBadge status={status} type="evaluation" />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evaluation History</CardTitle>
            </CardHeader>
            <CardContent>
              {evaluations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evaluations yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <Link
                            href={`/admin/projects/${ev.project_id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {(ev.projects as { product_name: string } | null)?.product_name ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(ev.projects as { companies: { name: string } } | null)?.companies?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ev.status} type="evaluation" />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ev.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ADMIN TAB ===== */}
        <TabsContent value="admin" className="mt-6">
          <DeveloperAdminPanel developer={dev} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components
function Field({
  label,
  value,
}: {
  label: string;
  value: string | string[] | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        {Array.isArray(value) ? (
          value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {value.map((v) => (
                <Badge key={v} variant="secondary" className="text-xs">
                  {v}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Not specified</span>
          )
        ) : value ? (
          <span className="text-sm">{value}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Not specified</span>
        )}
      </dd>
    </div>
  );
}

function LinkField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">Not specified</span>
        )}
      </dd>
    </div>
  );
}
