"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDeveloperProfile } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

interface EditDeveloperDialogProps {
  developer: {
    id: string;
    job_title: string | null;
    current_company: string | null;
    country: string | null;
    state_region: string | null;
    timezone: string | null;
    years_experience: number | null;
    linkedin_url: string | null;
    github_url: string | null;
    paypal_email: string | null;
  };
}

export function EditDeveloperDialog({ developer }: EditDeveloperDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [jobTitle, setJobTitle] = useState(developer.job_title ?? "");
  const [currentCompany, setCurrentCompany] = useState(developer.current_company ?? "");
  const [country, setCountry] = useState(developer.country ?? "");
  const [stateRegion, setStateRegion] = useState(developer.state_region ?? "");
  const [timezone, setTimezone] = useState(developer.timezone ?? "");
  const [yearsExperience, setYearsExperience] = useState(
    developer.years_experience != null ? String(developer.years_experience) : ""
  );
  const [linkedinUrl, setLinkedinUrl] = useState(developer.linkedin_url ?? "");
  const [githubUrl, setGithubUrl] = useState(developer.github_url ?? "");
  const [paypalEmail, setPaypalEmail] = useState(developer.paypal_email ?? "");

  function resetForm() {
    setJobTitle(developer.job_title ?? "");
    setCurrentCompany(developer.current_company ?? "");
    setCountry(developer.country ?? "");
    setStateRegion(developer.state_region ?? "");
    setTimezone(developer.timezone ?? "");
    setYearsExperience(
      developer.years_experience != null ? String(developer.years_experience) : ""
    );
    setLinkedinUrl(developer.linkedin_url ?? "");
    setGithubUrl(developer.github_url ?? "");
    setPaypalEmail(developer.paypal_email ?? "");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const data: Record<string, unknown> = {};
      if (jobTitle.trim()) data.job_title = jobTitle.trim();
      if (currentCompany.trim()) data.current_company = currentCompany.trim();
      if (country.trim()) data.country = country.trim();
      if (stateRegion.trim()) data.state_region = stateRegion.trim();
      if (timezone.trim()) data.timezone = timezone.trim();
      if (yearsExperience) {
        const n = parseInt(yearsExperience, 10);
        if (!isNaN(n)) data.years_experience = n;
      }
      if (linkedinUrl.trim()) data.linkedin_url = linkedinUrl.trim();
      if (githubUrl.trim()) data.github_url = githubUrl.trim();
      if (paypalEmail.trim()) data.paypal_email = paypalEmail.trim();

      const result = await updateDeveloperProfile(developer.id, data);

      if (!result.success) {
        setError(result.error ?? "Failed to update developer");
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit Profile
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Developer Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dev-job-title">Job Title</Label>
                <Input
                  id="dev-job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-company">Company</Label>
                <Input
                  id="dev-company"
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dev-country">Country</Label>
                <Input
                  id="dev-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="US"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-state">State/Region</Label>
                <Input
                  id="dev-state"
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  placeholder="CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-tz">Timezone</Label>
                <Input
                  id="dev-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="America/Los_Angeles"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-years">Years of Experience</Label>
              <Input
                id="dev-years"
                type="number"
                min="0"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dev-linkedin">LinkedIn URL</Label>
                <Input
                  id="dev-linkedin"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-github">GitHub URL</Label>
                <Input
                  id="dev-github"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-paypal">PayPal Email</Label>
              <Input
                id="dev-paypal"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="developer@example.com"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
