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
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Welcome to Built for Devs</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us a few things so we can match you with paid evaluations.
            This takes about 2 minutes. After you&apos;re set up, we&apos;ll
            match you with products that fit your skills.
          </p>
        </div>
        <ProfileOnboarding developer={developer} />
      </div>
    );
  }

  return <ProfileEditor developer={developer} />;
}
