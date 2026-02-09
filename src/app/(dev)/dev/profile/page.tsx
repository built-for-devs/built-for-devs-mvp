import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDevProfile } from "@/lib/dev/queries";
import { ProfileOnboarding } from "./profile-onboarding";
import { ProfileEditor } from "./profile-editor";

export default async function DevProfilePage() {
  const supabase = await createClient();
  const developer = await getDevProfile(supabase);

  if (!developer) {
    redirect("/login");
  }

  if (!developer.profile_complete) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground">
            Tell us about yourself so we can match you with relevant evaluations.
          </p>
        </div>
        <ProfileOnboarding developer={developer} />
      </div>
    );
  }

  return <ProfileEditor developer={developer} />;
}
