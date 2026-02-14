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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MultiSelectFilter } from "@/components/admin/multi-select-filter";
import { Pencil } from "lucide-react";
import {
  formatEnumLabel,
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  frameworkOptions,
  databaseOptions,
  cloudPlatformOptions,
  devopsToolOptions,
  cicdToolOptions,
  testingFrameworkOptions,
  apiExperienceOptions,
  operatingSystemOptions,
  industryOptions,
  companySizeOptions,
  buyingInfluenceOptions,
  paidToolOptions,
  ossActivityOptions,
} from "@/lib/admin/filter-options";

interface EditDeveloperDialogProps {
  developer: {
    id: string;
    job_title: string | null;
    current_company: string | null;
    role_types: string[] | null;
    seniority: string | null;
    years_experience: number | null;
    company_size: string | null;
    industries: string[] | null;
    languages: string[] | null;
    frameworks: string[] | null;
    databases: string[] | null;
    cloud_platforms: string[] | null;
    devops_tools: string[] | null;
    cicd_tools: string[] | null;
    testing_frameworks: string[] | null;
    api_experience: string[] | null;
    operating_systems: string[] | null;
    team_size: number | null;
    buying_influence: string | null;
    paid_tools: string[] | null;
    open_source_activity: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    twitter_url: string | null;
    devto_url?: string | null;
    website_url: string | null;
    country: string | null;
    state_region: string | null;
    city: string | null;
    timezone: string | null;
    paypal_email: string | null;
  };
}

export function EditDeveloperDialog({ developer }: EditDeveloperDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // -- Professional Identity --
  const [jobTitle, setJobTitle] = useState(developer.job_title ?? "");
  const [currentCompany, setCurrentCompany] = useState(developer.current_company ?? "");
  const [roleTypes, setRoleTypes] = useState<string[]>(developer.role_types ?? []);
  const [seniority, setSeniority] = useState(developer.seniority ?? "");
  const [yearsExperience, setYearsExperience] = useState(
    developer.years_experience != null ? String(developer.years_experience) : ""
  );
  const [companySize, setCompanySize] = useState(developer.company_size ?? "");
  const [industries, setIndustries] = useState<string[]>(developer.industries ?? []);

  // -- Technical Profile --
  const [languages, setLanguages] = useState<string[]>(developer.languages ?? []);
  const [frameworks, setFrameworks] = useState<string[]>(developer.frameworks ?? []);
  const [databases, setDatabases] = useState<string[]>(developer.databases ?? []);
  const [cloudPlatforms, setCloudPlatforms] = useState<string[]>(developer.cloud_platforms ?? []);
  const [devopsTools, setDevopsTools] = useState<string[]>(developer.devops_tools ?? []);
  const [cicdTools, setCicdTools] = useState<string[]>(developer.cicd_tools ?? []);
  const [testingFrameworks, setTestingFrameworks] = useState<string[]>(developer.testing_frameworks ?? []);
  const [apiExperience, setApiExperience] = useState<string[]>(developer.api_experience ?? []);
  const [operatingSystems, setOperatingSystems] = useState<string[]>(developer.operating_systems ?? []);

  // -- Development Context --
  const [teamSize, setTeamSize] = useState(
    developer.team_size != null ? String(developer.team_size) : ""
  );
  const [buyingInfluence, setBuyingInfluence] = useState(developer.buying_influence ?? "");
  const [paidTools, setPaidTools] = useState<string[]>(developer.paid_tools ?? []);
  const [openSourceActivity, setOpenSourceActivity] = useState(developer.open_source_activity ?? "");

  // -- Online Profiles --
  const [linkedinUrl, setLinkedinUrl] = useState(developer.linkedin_url ?? "");
  const [githubUrl, setGithubUrl] = useState(developer.github_url ?? "");
  const [twitterUrl, setTwitterUrl] = useState(developer.twitter_url ?? "");
  const [devtoUrl, setDevtoUrl] = useState(developer.devto_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(developer.website_url ?? "");

  // -- Demographics --
  const [city, setCity] = useState(developer.city ?? "");
  const [stateRegion, setStateRegion] = useState(developer.state_region ?? "");
  const [country, setCountry] = useState(developer.country ?? "");
  const [timezone, setTimezone] = useState(developer.timezone ?? "");
  const [paypalEmail, setPaypalEmail] = useState(developer.paypal_email ?? "");

  function resetForm() {
    setJobTitle(developer.job_title ?? "");
    setCurrentCompany(developer.current_company ?? "");
    setRoleTypes(developer.role_types ?? []);
    setSeniority(developer.seniority ?? "");
    setYearsExperience(developer.years_experience != null ? String(developer.years_experience) : "");
    setCompanySize(developer.company_size ?? "");
    setIndustries(developer.industries ?? []);
    setLanguages(developer.languages ?? []);
    setFrameworks(developer.frameworks ?? []);
    setDatabases(developer.databases ?? []);
    setCloudPlatforms(developer.cloud_platforms ?? []);
    setDevopsTools(developer.devops_tools ?? []);
    setCicdTools(developer.cicd_tools ?? []);
    setTestingFrameworks(developer.testing_frameworks ?? []);
    setApiExperience(developer.api_experience ?? []);
    setOperatingSystems(developer.operating_systems ?? []);
    setTeamSize(developer.team_size != null ? String(developer.team_size) : "");
    setBuyingInfluence(developer.buying_influence ?? "");
    setPaidTools(developer.paid_tools ?? []);
    setOpenSourceActivity(developer.open_source_activity ?? "");
    setLinkedinUrl(developer.linkedin_url ?? "");
    setGithubUrl(developer.github_url ?? "");
    setTwitterUrl(developer.twitter_url ?? "");
    setDevtoUrl(developer.devto_url ?? "");
    setWebsiteUrl(developer.website_url ?? "");
    setCity(developer.city ?? "");
    setStateRegion(developer.state_region ?? "");
    setCountry(developer.country ?? "");
    setTimezone(developer.timezone ?? "");
    setPaypalEmail(developer.paypal_email ?? "");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const data: Record<string, unknown> = {};

      // Text fields — send empty string as null to clear
      const textFields: [string, string][] = [
        ["job_title", jobTitle],
        ["current_company", currentCompany],
        ["country", country],
        ["state_region", stateRegion],
        ["city", city],
        ["timezone", timezone],
        ["linkedin_url", linkedinUrl],
        ["github_url", githubUrl],
        ["twitter_url", twitterUrl],
        ["devto_url", devtoUrl],
        ["website_url", websiteUrl],
        ["paypal_email", paypalEmail],
      ];
      for (const [key, val] of textFields) {
        data[key] = val.trim() || null;
      }

      // Number fields
      if (yearsExperience) {
        const n = parseInt(yearsExperience, 10);
        if (!isNaN(n)) data.years_experience = n;
        else data.years_experience = null;
      } else {
        data.years_experience = null;
      }

      if (teamSize) {
        const n = parseInt(teamSize, 10);
        if (!isNaN(n)) data.team_size = n;
        else data.team_size = null;
      } else {
        data.team_size = null;
      }

      // Enum fields — "__none" is the Select clear sentinel
      const cleanEnum = (v: string) => (v && v !== "__none" ? v : null);
      data.seniority = cleanEnum(seniority);
      data.company_size = cleanEnum(companySize);
      data.buying_influence = cleanEnum(buyingInfluence);
      data.open_source_activity = cleanEnum(openSourceActivity);

      // Array fields
      data.role_types = roleTypes;
      data.industries = industries;
      data.languages = languages;
      data.frameworks = frameworks;
      data.databases = databases;
      data.cloud_platforms = cloudPlatforms;
      data.devops_tools = devopsTools;
      data.cicd_tools = cicdTools;
      data.testing_frameworks = testingFrameworks;
      data.api_experience = apiExperience;
      data.operating_systems = operatingSystems;
      data.paid_tools = paidTools;

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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Developer Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Professional Identity */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Professional Identity</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Job Title</Label>
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Engineer" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company</Label>
                  <Input value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Seniority</Label>
                  <Select value={seniority} onValueChange={setSeniority}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {seniorityOptions.map((o) => (
                        <SelectItem key={o} value={o}>{formatEnumLabel(o)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Years Experience</Label>
                  <Input type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {companySizeOptions.map((o) => (
                        <SelectItem key={o} value={o}>{formatEnumLabel(o)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <MultiSelectFilter label="Role Types" options={roleTypeOptions} selected={roleTypes} onChange={setRoleTypes} />
                <MultiSelectFilter label="Industries" options={industryOptions} selected={industries} onChange={setIndustries} />
              </div>
            </section>

            <Separator />

            {/* Technical Profile */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Technical Profile</h3>
              <div className="grid grid-cols-3 gap-3">
                <MultiSelectFilter label="Languages" options={languageOptions} selected={languages} onChange={setLanguages} />
                <MultiSelectFilter label="Frameworks" options={frameworkOptions} selected={frameworks} onChange={setFrameworks} />
                <MultiSelectFilter label="Databases" options={databaseOptions} selected={databases} onChange={setDatabases} />
                <MultiSelectFilter label="Cloud" options={cloudPlatformOptions} selected={cloudPlatforms} onChange={setCloudPlatforms} />
                <MultiSelectFilter label="DevOps" options={devopsToolOptions} selected={devopsTools} onChange={setDevopsTools} />
                <MultiSelectFilter label="CI/CD" options={cicdToolOptions} selected={cicdTools} onChange={setCicdTools} />
                <MultiSelectFilter label="Testing" options={testingFrameworkOptions} selected={testingFrameworks} onChange={setTestingFrameworks} />
                <MultiSelectFilter label="API" options={apiExperienceOptions} selected={apiExperience} onChange={setApiExperience} />
                <MultiSelectFilter label="OS" options={operatingSystemOptions} selected={operatingSystems} onChange={setOperatingSystems} />
              </div>
            </section>

            <Separator />

            {/* Development Context */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Development Context</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Team Size</Label>
                  <Input type="number" min="1" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Buying Influence</Label>
                  <Select value={buyingInfluence} onValueChange={setBuyingInfluence}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {buyingInfluenceOptions.map((o) => (
                        <SelectItem key={o} value={o}>{formatEnumLabel(o)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Open Source Activity</Label>
                  <Select value={openSourceActivity} onValueChange={setOpenSourceActivity}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {ossActivityOptions.map((o) => (
                        <SelectItem key={o} value={o}>{formatEnumLabel(o)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <MultiSelectFilter label="Paid Tools" options={paidToolOptions} selected={paidTools} onChange={setPaidTools} />
              </div>
            </section>

            <Separator />

            {/* Online Profiles */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Online Profiles</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">LinkedIn URL</Label>
                  <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">GitHub URL</Label>
                  <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Twitter URL</Label>
                  <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://twitter.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dev.to URL</Label>
                  <Input value={devtoUrl} onChange={(e) => setDevtoUrl(e.target.value)} placeholder="https://dev.to/..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Website URL</Label>
                  <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </section>

            <Separator />

            {/* Demographics & Logistics */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Demographics & Logistics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State/Region</Label>
                  <Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="California" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Timezone</Label>
                  <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Los_Angeles" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">PayPal Email</Label>
                  <Input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="developer@example.com" />
                </div>
              </div>
            </section>

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
