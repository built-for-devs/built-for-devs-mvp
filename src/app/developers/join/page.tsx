"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/dev/tag-input";
import { SearchableSelect } from "@/components/dev/searchable-select";
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
  countryOptions,
  timezoneOptions,
} from "@/lib/admin/filter-options";

const STEPS = ["About You", "Payment & Location", "Your Tech Stack", "Create Account"];

const seniorityDescriptions: Record<string, string> = {
  early_career: "0\u20134 years, building core skills",
  senior: "5+ years, deep expertise in your stack",
  leadership: "8+ years, guiding technical decisions",
};

export default function DeveloperJoinPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  // Step 1: About You
  const [seniority, setSeniority] = useState("");
  const [roleTypes, setRoleTypes] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");

  // Step 2: Payment & Location
  const [paypalEmail, setPaypalEmail] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");

  // Step 3: Tech Stack (optional)
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [cloudPlatforms, setCloudPlatforms] = useState<string[]>([]);
  const [devopsTools, setDevopsTools] = useState<string[]>([]);
  const [cicdTools, setCicdTools] = useState<string[]>([]);
  const [testingFrameworks, setTestingFrameworks] = useState<string[]>([]);
  const [apiExperience, setApiExperience] = useState<string[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<string[]>([]);

  // Step 4: Create Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function validateStep1(): string | null {
    if (!seniority) return "Please select your seniority level.";
    if (roleTypes.length === 0) return "Please select at least one role type.";
    if (languages.length === 0) return "Please select at least one language.";
    return null;
  }

  function validateStep2(): string | null {
    if (!paypalEmail) return "Please enter your PayPal email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail))
      return "Please enter a valid email address.";
    if (!country) return "Please select your country.";
    if (!timezone) return "Please select your timezone.";
    return null;
  }

  function goToStep(nextStep: number) {
    if (nextStep > step) {
      const validationError =
        step === 0 ? validateStep1() : step === 1 ? validateStep2() : null;
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError(null);
    setStep(nextStep);
  }

  function buildProfileData() {
    return {
      seniority: seniority || null,
      role_types: roleTypes.length > 0 ? roleTypes : null,
      languages: languages.length > 0 ? languages : null,
      years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
      paypal_email: paypalEmail || null,
      country: country || null,
      timezone: timezone || null,
      frameworks: frameworks.length > 0 ? frameworks : null,
      databases: databases.length > 0 ? databases : null,
      cloud_platforms: cloudPlatforms.length > 0 ? cloudPlatforms : null,
      devops_tools: devopsTools.length > 0 ? devopsTools : null,
      cicd_tools: cicdTools.length > 0 ? cicdTools : null,
      testing_frameworks: testingFrameworks.length > 0 ? testingFrameworks : null,
      api_experience: apiExperience.length > 0 ? apiExperience : null,
      operating_systems: operatingSystems.length > 0 ? operatingSystems : null,
    };
  }

  async function handleSignup() {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    // Store profile data in localStorage so it can be saved after login
    localStorage.setItem("bfd_dev_profile", JSON.stringify(buildProfileData()));

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "developer",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setConfirmEmail(true);
      setLoading(false);
      return;
    }

    // If no email confirmation required, redirect directly
    router.refresh();
    router.push("/dev/profile");
  }

  if (confirmEmail) {
    return (
      <div className="min-h-screen bg-white">
        <Nav />
        <section className="px-6 py-20">
          <div className="mx-auto max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Check your email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We sent a confirmation link to <strong>{email}</strong>. Click
                  the link to activate your account, then log in to start
                  receiving evaluation invitations.
                </p>
                <p className="text-sm text-muted-foreground">
                  Your profile info has been saved and will be applied
                  automatically when you log in.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-brand-dark">
              Join Built for Devs
            </h1>
            <p className="mt-2 text-brand-gray">
              Takes about 2 minutes. Start getting paid to evaluate developer
              tools.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Step {step + 1} of {STEPS.length}
              </span>
              <span>{STEPS[step]}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand-green transition-all"
                style={{
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{STEPS[step]}</CardTitle>
              {step === 2 && (
                <CardDescription>
                  Optional but helps us match you with the right products.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Seniority Level</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {seniorityOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSeniority(opt)}
                          className={`rounded-lg border p-4 text-center transition-colors ${
                            seniority === opt
                              ? "border-primary bg-primary/5 font-medium"
                              : "border-border hover:bg-accent/50"
                          }`}
                        >
                          <span className="block text-sm font-medium">
                            {formatEnumLabel(opt)}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {seniorityDescriptions[opt]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role Types</Label>
                    <TagInput
                      label="Role Types"
                      options={roleTypeOptions}
                      selected={roleTypes}
                      onChange={setRoleTypes}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Languages</Label>
                    <TagInput
                      label="Languages"
                      options={languageOptions}
                      selected={languages}
                      onChange={setLanguages}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="e.g. 8"
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label>PayPal Email</Label>
                    <Input
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="payments@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is where we send your $129 evaluation payments.
                    </p>
                  </div>
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
                    <Label>Timezone</Label>
                    <SearchableSelect
                      options={timezoneOptions}
                      value={timezone}
                      onChange={setTimezone}
                      placeholder="Select timezone..."
                      searchPlaceholder="Search timezones..."
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Frameworks</Label>
                    <TagInput
                      label="Frameworks"
                      options={frameworkOptions}
                      selected={frameworks}
                      onChange={setFrameworks}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Databases</Label>
                    <TagInput
                      label="Databases"
                      options={databaseOptions}
                      selected={databases}
                      onChange={setDatabases}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cloud Platforms</Label>
                    <TagInput
                      label="Cloud Platforms"
                      options={cloudPlatformOptions}
                      selected={cloudPlatforms}
                      onChange={setCloudPlatforms}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DevOps Tools</Label>
                    <TagInput
                      label="DevOps Tools"
                      options={devopsToolOptions}
                      selected={devopsTools}
                      onChange={setDevopsTools}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CI/CD Tools</Label>
                    <TagInput
                      label="CI/CD Tools"
                      options={cicdToolOptions}
                      selected={cicdTools}
                      onChange={setCicdTools}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Testing Frameworks</Label>
                    <TagInput
                      label="Testing Frameworks"
                      options={testingFrameworkOptions}
                      selected={testingFrameworks}
                      onChange={setTestingFrameworks}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Experience</Label>
                    <TagInput
                      label="API Experience"
                      options={apiExperienceOptions}
                      selected={apiExperience}
                      onChange={setApiExperience}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operating Systems</Label>
                    <TagInput
                      label="Operating Systems"
                      options={operatingSystemOptions}
                      selected={operatingSystems}
                      onChange={setOperatingSystems}
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="underline">
                      Log in
                    </Link>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(step - 1)}
              disabled={step === 0}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {step === 2 && (
                <Button variant="ghost" onClick={() => { setError(null); setStep(3); }}>
                  Skip
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={() => goToStep(step + 1)}>Continue</Button>
              ) : (
                <Button onClick={handleSignup} disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
