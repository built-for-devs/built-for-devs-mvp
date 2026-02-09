import Link from "next/link";
import { Users, Building2, FolderKanban, ClipboardCheck, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardStats,
  getNeedsAttentionProjects,
  getNeedsReviewEvaluations,
  getNeedsPaymentEvaluations,
} from "@/lib/admin/queries";
import { StatCard } from "@/components/admin/stat-card";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [stats, needsAssignment, needsReview, needsPayment] = await Promise.all([
    getDashboardStats(supabase),
    getNeedsAttentionProjects(supabase),
    getNeedsReviewEvaluations(supabase),
    getNeedsPaymentEvaluations(supabase),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Developers"
          value={stats.totalDevelopers}
          description={`${stats.completedProfiles} complete profiles`}
          icon={Users}
        />
        <StatCard
          label="Companies"
          value={stats.totalCompanies}
          icon={Building2}
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={FolderKanban}
        />
        <StatCard
          label="Needs Review"
          value={stats.evaluationsNeedingReview}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Needs Payment"
          value={stats.evaluationsNeedingPayment}
          icon={DollarSign}
        />
      </div>

      {/* Needs Attention sections */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Projects needing developer assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects Needing Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            {needsAssignment.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Evals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsAssignment.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {project.product_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(project.companies as { name: string } | null)?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {project.num_evaluations}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Evaluations needing review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluations Needing Review</CardTitle>
          </CardHeader>
          <CardContent>
            {needsReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>Product</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsReview.map((ev) => {
                    const devName =
                      (ev.developers as { profiles: { full_name: string } } | null)
                        ?.profiles?.full_name ?? "Unknown";
                    const productName =
                      (ev.projects as { product_name: string } | null)
                        ?.product_name ?? "—";
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="text-sm font-medium">
                          {devName}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/projects/${ev.project_id}`}
                            className="text-sm text-muted-foreground hover:underline"
                          >
                            {productName}
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Evaluations needing payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluations Needing Payment</CardTitle>
          </CardHeader>
          <CardContent>
            {needsPayment.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsPayment.map((ev) => {
                    const devName =
                      (ev.developers as { profiles: { full_name: string } } | null)
                        ?.profiles?.full_name ?? "Unknown";
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="text-sm font-medium">
                          {devName}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          ${ev.payout_amount ?? 0}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
