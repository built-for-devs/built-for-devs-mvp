import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyById } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/page-header";
import { EditCompanyDialog } from "./edit-company-dialog";
import { DeleteCompanyButton } from "./delete-company-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { CompanyNotesEditor } from "./notes-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await getCompanyById(supabase, id);

  if (!result) notFound();

  const { company, projects, contacts } = result;

  return (
    <div className="space-y-8">
      <PageHeader title={company.name}>
        <EditCompanyDialog company={company} />
      </PageHeader>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Website</dt>
              <dd className="text-sm">
                {company.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {company.website}
                  </a>
                ) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Industry</dt>
              <dd className="text-sm">{company.industry ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Size</dt>
              <dd className="text-sm">{company.size ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Stripe Customer</dt>
              <dd className="text-sm text-muted-foreground">{company.stripe_customer_id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm">{new Date(company.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyNotesEditor companyId={company.id} initialValue={company.admin_notes} />
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Primary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => {
                  const profile = contact.profiles as { full_name: string; email: string } | null;
                  return (
                    <TableRow key={contact.id}>
                      <TableCell className="text-sm font-medium">
                        {profile?.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{profile?.email ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.role_at_company ?? "—"}
                      </TableCell>
                      <TableCell>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Evaluations</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {project.product_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} type="project" />
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.num_evaluations}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete company</p>
              <p className="text-xs text-muted-foreground">
                Permanently remove this company and all associated data.
              </p>
            </div>
            <DeleteCompanyButton companyId={company.id} companyName={company.name} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
