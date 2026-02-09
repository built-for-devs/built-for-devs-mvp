import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCompanies } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/page-header";
import { CreateCompanyDialog } from "./create-company-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const companies = await getCompanies(supabase);

  return (
    <div>
      <PageHeader
        title="Companies"
        description={`${companies.length} compan${companies.length !== 1 ? "ies" : "y"}`}
      >
        <CreateCompanyDialog />
      </PageHeader>

      {companies.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No companies yet.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="font-medium hover:underline"
                    >
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {company.industry ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {company.projectCount}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {company.totalSpend > 0 ? `$${company.totalSpend}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(company.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
