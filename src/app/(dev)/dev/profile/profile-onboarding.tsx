"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/dev/tag-input";
import { SearchableSelect } from "@/components/dev/searchable-select";
import { updateProfile } from "@/lib/dev/actions";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import {
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  countryOptions,
  timezoneOptions,
} from "@/lib/admin/filter-options";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Tables } from "@/types/database";

type Developer = Tables<"developers">;

const STEPS = ["About You", "Payment & Location"];

const seniorityDescriptions: Record<string, string> = {
  early_career: "0\u20134 years, building core skills",
  senior: "5+ years, deep expertise in your stack",
  leadership: "8+ years, guiding technical decisions",
};

export function ProfileOnboarding({ developer }: { developer: Developer }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // Step 1: About You
  const [seniority, setSeniority] = useState(developer.seniority ?? "");
  const [roleTypes, setRoleTypes] = useState<string[]>(developer.role_types ?? []);
  const [languages, setLanguages] = useState<string[]>(developer.languages ?? []);
  const [yearsExperience, setYearsExperience] = useState(
    developer.years_experience?.toString() ?? ""
  );

  // Step 2: Payment & Location
  const [paypalEmail, setPaypalEmail] = useState(developer.paypal_email ?? "");
  const [country, setCountry] = useState(developer.country ?? "");
  const [timezone, setTimezone] = useState(developer.timezone ?? "");

  // Check for profile data from /developers/join flow
  useEffect(() => {
    const stored = localStorage.getItem("bfd_dev_profile");
    if (!stored) return;

    try {
      const profileData = JSON.parse(stored);
      localStorage.removeItem("bfd_dev_profile");

      // Auto-save the profile data and complete
      setAutoSaving(true);
      const data = {
        ...profileData,
        profile_complete: true,
        is_available: true,
      };
      updateProfile(data as Parameters<typeof updateProfile>[0]).then(
        (result) => {
          setAutoSaving(false);
          if (result.success) {
            setCompleted(true);
            router.refresh();
          } else {
            // If auto-save fails, pre-fill the form so they can try manually
            if (profileData.seniority) setSeniority(profileData.seniority);
            if (profileData.role_types) setRoleTypes(profileData.role_types);
            if (profileData.languages) setLanguages(profileData.languages);
            if (profileData.years_experience)
              setYearsExperience(String(profileData.years_experience));
            if (profileData.paypal_email) setPaypalEmail(profileData.paypal_email);
            if (profileData.country) setCountry(profileData.country);
            if (profileData.timezone) setTimezone(profileData.timezone);
            setError("We couldn\u2019t save your profile automatically. Please try again.");
          }
        }
      );
    } catch {
      localStorage.removeItem("bfd_dev_profile");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getAllData() {
    return {
      seniority: seniority || null,
      role_types: roleTypes.length > 0 ? roleTypes : null,
      languages: languages.length > 0 ? languages : null,
      years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
      paypal_email: paypalEmail || null,
      country: country || null,
      timezone: timezone || null,
    } as Parameters<typeof updateProfile>[0];
  }

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
    if (!country) return "Please enter your country.";
    if (!timezone) return "Please select your timezone.";
    return null;
  }

  async function saveAndContinue() {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateProfile(getAllData());
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Failed to save profile");
      return;
    }
    setStep(1);
  }

  async function completeProfile() {
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    const data = getAllData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any).profile_complete = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any).is_available = true;
    const result = await updateProfile(data);
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Failed to complete profile");
      return;
    }
    setCompleted(true);
    router.refresh();
  }

  if (autoSaving) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Setting up your profile...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">You&apos;re all set!</h2>
          <p className="mt-2 text-muted-foreground">
            Your profile is live and you&apos;ll receive evaluation invitations
            that match your skills.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dev/evaluations">View My Evaluations</Link>
        </Button>
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm font-medium">Want better matches?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The more we know about your tech stack, the better we can match you
            with relevant products.
          </p>
          <Button variant="ghost" size="sm" asChild className="mt-2">
            <Link href="/dev/profile">Complete Full Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
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
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => { setStep(step - 1); setError(null); }}
          disabled={step === 0}
        >
          Back
        </Button>
        {step === 0 ? (
          <Button onClick={saveAndContinue} disabled={saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        ) : (
          <Button onClick={completeProfile} disabled={saving}>
            {saving ? "Completing..." : "Complete Profile"}
          </Button>
        )}
      </div>
    </div>
  );
}
