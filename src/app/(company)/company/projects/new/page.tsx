import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyForUser } from "@/lib/company/queries";
import { ProjectWizard } from "./project-wizard";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const companyData = await getCompanyForUser(supabase);

  if (!companyData) {
    redirect("/company/onboarding");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Project</h1>
        <p className="mt-1 text-muted-foreground">
          Set up a developer evaluation project for your product.
        </p>
      </div>
      <ProjectWizard companyId={companyData.company.id} />
    </div>
  );
}
