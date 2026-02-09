import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyProjects } from "@/lib/company/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { formatEnumLabel } from "@/lib/admin/filter-options";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_payment: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  matching: "bg-purple-100 text-purple-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  evaluations_complete: "bg-teal-100 text-teal-700",
  report_drafting: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

export default async function CompanyProjectsPage() {
  const supabase = await createClient();
  const { company, projects } = await getCompanyProjects(supabase);

  if (!company) {
    redirect("/company/onboarding");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your developer evaluation projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/company/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Create your first evaluation project to get real developer
              feedback on your product.
            </p>
            <Button asChild className="mt-6">
              <Link href="/company/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/company/projects/${project.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {project.product_name}
                      </CardTitle>
                      {project.product_category && (
                        <CardDescription>
                          {formatEnumLabel(project.product_category)}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={statusColors[project.status] ?? ""}
                    >
                      {formatEnumLabel(project.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      {project.completedEvaluations} of{" "}
                      {project.num_evaluations} evaluations complete
                    </span>
                    <span>
                      Created{" "}
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {project.totalEvaluations > 0 && (
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${(project.completedEvaluations / project.num_evaluations) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
