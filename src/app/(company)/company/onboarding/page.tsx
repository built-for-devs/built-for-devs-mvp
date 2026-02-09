import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyForUser } from "@/lib/company/queries";
import { OnboardingForm } from "./onboarding-form";

export default async function CompanyOnboardingPage() {
  const supabase = await createClient();
  const companyData = await getCompanyForUser(supabase);

  if (companyData) {
    redirect("/company/projects");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome to Built for Devs</h1>
        <p className="mt-2 text-muted-foreground">
          Set up your company profile to start creating evaluation projects.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
