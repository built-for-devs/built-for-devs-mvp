"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/dev/tag-input";
import { SearchableSelect } from "@/components/dev/searchable-select";
import { updateProfile } from "@/lib/dev/actions";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import {
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
  countryOptions,
  timezoneOptions,
} from "@/lib/admin/filter-options";
import type { Tables } from "@/types/database";

type Developer = Tables<"developers">;

export function ProfileEditor({ developer }: { developer: Developer }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All fields
  const [jobTitle, setJobTitle] = useState(developer.job_title ?? "");
  const [roleTypes, setRoleTypes] = useState<string[]>(developer.role_types ?? []);
  const [yearsExperience, setYearsExperience] = useState(
    developer.years_experience?.toString() ?? ""
  );
  const [seniority, setSeniority] = useState(developer.seniority ?? "");
  const [currentCompany, setCurrentCompany] = useState(developer.current_company ?? "");
  const [companySize, setCompanySize] = useState(developer.company_size ?? "");
  const [industries, setIndustries] = useState<string[]>(developer.industries ?? []);
  const [languages, setLanguages] = useState<string[]>(developer.languages ?? []);
  const [frameworks, setFrameworks] = useState<string[]>(developer.frameworks ?? []);
  const [databases, setDatabases] = useState<string[]>(developer.databases ?? []);
  const [cloudPlatforms, setCloudPlatforms] = useState<string[]>(developer.cloud_platforms ?? []);
  const [devopsTools, setDevopsTools] = useState<string[]>(developer.devops_tools ?? []);
  const [cicdTools, setCicdTools] = useState<string[]>(developer.cicd_tools ?? []);
  const [testingFrameworks, setTestingFrameworks] = useState<string[]>(developer.testing_frameworks ?? []);
  const [apiExperience, setApiExperience] = useState<string[]>(developer.api_experience ?? []);
  const [operatingSystems, setOperatingSystems] = useState<string[]>(developer.operating_systems ?? []);
  const [teamSize, setTeamSize] = useState(developer.team_size?.toString() ?? "");
  const [buyingInfluence, setBuyingInfluence] = useState(developer.buying_influence ?? "");
  const [paidTools, setPaidTools] = useState<string[]>(developer.paid_tools ?? []);
  const [openSourceActivity, setOpenSourceActivity] = useState(developer.open_source_activity ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(developer.linkedin_url ?? "");
  const [githubUrl, setGithubUrl] = useState(developer.github_url ?? "");
  const [twitterUrl, setTwitterUrl] = useState(developer.twitter_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(developer.website_url ?? "");
  const [country, setCountry] = useState(developer.country ?? "");
  const [stateRegion, setStateRegion] = useState(developer.state_region ?? "");
  const [timezone, setTimezone] = useState(developer.timezone ?? "");
  const [preferredEvalTimes, setPreferredEvalTimes] = useState<string[]>(developer.preferred_eval_times ?? []);
  const [paypalEmail, setPaypalEmail] = useState(developer.paypal_email ?? "");

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const result = await updateProfile({
      job_title: jobTitle || null,
      role_types: roleTypes.length > 0 ? roleTypes : null,
      years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
      seniority: seniority || null,
      current_company: currentCompany || null,
      company_size: companySize || null,
      industries: industries.length > 0 ? industries : null,
      languages: languages.length > 0 ? languages : null,
      frameworks: frameworks.length > 0 ? frameworks : null,
      databases: databases.length > 0 ? databases : null,
      cloud_platforms: cloudPlatforms.length > 0 ? cloudPlatforms : null,
      devops_tools: devopsTools.length > 0 ? devopsTools : null,
      cicd_tools: cicdTools.length > 0 ? cicdTools : null,
      testing_frameworks: testingFrameworks.length > 0 ? testingFrameworks : null,
      api_experience: apiExperience.length > 0 ? apiExperience : null,
      operating_systems: operatingSystems.length > 0 ? operatingSystems : null,
      team_size: teamSize ? parseInt(teamSize, 10) : null,
      buying_influence: buyingInfluence || null,
      paid_tools: paidTools.length > 0 ? paidTools : null,
      open_source_activity: openSourceActivity || null,
      linkedin_url: linkedinUrl || null,
      github_url: githubUrl || null,
      twitter_url: twitterUrl || null,
      website_url: websiteUrl || null,
      country: country || null,
      state_region: stateRegion || null,
      timezone: timezone || null,
      preferred_eval_times: preferredEvalTimes.length > 0 ? preferredEvalTimes : null,
      paypal_email: paypalEmail || null,
    } as Parameters<typeof updateProfile>[0]);
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Failed to save profile");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Profile</h1>
          <p className="text-sm text-muted-foreground">
            Keep your profile up to date to get matched with relevant evaluations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <Badge variant="secondary" className="text-xs">
              Saved
            </Badge>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Professional Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Professional Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role Types</Label>
            <TagInput label="Role Types" options={roleTypeOptions} selected={roleTypes} onChange={setRoleTypes} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Seniority Level</Label>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {seniorityOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{formatEnumLabel(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Company</Label>
              <Input value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {companySizeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Industries</Label>
            <TagInput label="Industries" options={industryOptions} selected={industries} onChange={setIndustries} />
          </div>
        </CardContent>
      </Card>

      {/* Technical Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Languages</Label>
              <TagInput label="Languages" options={languageOptions} selected={languages} onChange={setLanguages} />
            </div>
            <div className="space-y-2">
              <Label>Frameworks</Label>
              <TagInput label="Frameworks" options={frameworkOptions} selected={frameworks} onChange={setFrameworks} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Databases</Label>
              <TagInput label="Databases" options={databaseOptions} selected={databases} onChange={setDatabases} />
            </div>
            <div className="space-y-2">
              <Label>Cloud Platforms</Label>
              <TagInput label="Cloud" options={cloudPlatformOptions} selected={cloudPlatforms} onChange={setCloudPlatforms} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>DevOps Tools</Label>
              <TagInput label="DevOps" options={devopsToolOptions} selected={devopsTools} onChange={setDevopsTools} />
            </div>
            <div className="space-y-2">
              <Label>CI/CD Tools</Label>
              <TagInput label="CI/CD" options={cicdToolOptions} selected={cicdTools} onChange={setCicdTools} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Testing Frameworks</Label>
              <TagInput label="Testing" options={testingFrameworkOptions} selected={testingFrameworks} onChange={setTestingFrameworks} />
            </div>
            <div className="space-y-2">
              <Label>API Experience</Label>
              <TagInput label="API" options={apiExperienceOptions} selected={apiExperience} onChange={setApiExperience} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Operating Systems</Label>
            <TagInput label="OS" options={operatingSystemOptions} selected={operatingSystems} onChange={setOperatingSystems} />
          </div>
        </CardContent>
      </Card>

      {/* Development Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Development Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team Size</Label>
              <Input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Buying Influence</Label>
              <Select value={buyingInfluence} onValueChange={setBuyingInfluence}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {buyingInfluenceOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{formatEnumLabel(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Paid Tools You Use</Label>
            <TagInput label="Paid Tools" options={paidToolOptions} selected={paidTools} onChange={setPaidTools} />
          </div>
          <div className="space-y-2">
            <Label>Open Source Activity</Label>
            <Select value={openSourceActivity} onValueChange={setOpenSourceActivity}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {ossActivityOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{formatEnumLabel(opt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Online Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Online Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="space-y-2">
              <Label>GitHub</Label>
              <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Twitter / X</Label>
              <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://twitter.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demographics & Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <SearchableSelect
                options={countryOptions}
                value={country}
                onChange={setCountry}
                placeholder="Select country..."
                searchPlaceholder="Search countries..."
              />
            </div>
            <div className="space-y-2">
              <Label>State / Region</Label>
              <Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <SearchableSelect
              options={timezoneOptions}
              value={timezone}
              onChange={setTimezone}
              placeholder="Select timezone..."
              searchPlaceholder="Search timezones..."
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred Evaluation Times</Label>
            <TagInput label="Times" options={["morning", "afternoon", "evening", "weekends"]} selected={preferredEvalTimes} onChange={setPreferredEvalTimes} />
          </div>
          <div className="space-y-2">
            <Label>PayPal Email (for payouts)</Label>
            <Input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Save button at bottom too */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
