"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { importDevelopers } from "@/lib/admin/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowLeft, ArrowRight, Check } from "lucide-react";

const DEVELOPER_FIELDS = [
  { value: "skip", label: "Skip column" },
  { value: "email", label: "Email *" },
  { value: "full_name", label: "Full Name *" },
  { value: "job_title", label: "Job Title" },
  { value: "current_company", label: "Current Company" },
  { value: "years_experience", label: "Years Experience" },
  { value: "seniority", label: "Seniority" },
  { value: "country", label: "Country" },
  { value: "state_region", label: "State/Region" },
  { value: "timezone", label: "Timezone" },
  { value: "linkedin_url", label: "LinkedIn URL" },
  { value: "github_url", label: "GitHub URL" },
  { value: "twitter_url", label: "Twitter URL" },
  { value: "website_url", label: "Website URL" },
  { value: "paypal_email", label: "PayPal Email" },
  { value: "role_types", label: "Role Types (comma-separated)" },
  { value: "languages", label: "Languages (comma-separated)" },
  { value: "frameworks", label: "Frameworks (comma-separated)" },
  { value: "databases", label: "Databases (comma-separated)" },
  { value: "cloud_platforms", label: "Cloud Platforms (comma-separated)" },
  { value: "industries", label: "Industries (comma-separated)" },
];

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export default function ImportDevelopersPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const parsedRows = results.data as Record<string, string>[];
        const csvHeaders = results.meta.fields ?? [];
        setHeaders(csvHeaders);
        setRows(parsedRows);

        // Auto-map obvious columns
        const autoMap: Record<string, string> = {};
        for (const header of csvHeaders) {
          const lower = header.toLowerCase().replace(/[^a-z]/g, "");
          if (lower === "email" || lower === "emailaddress") autoMap[header] = "email";
          else if (lower === "name" || lower === "fullname") autoMap[header] = "full_name";
          else if (lower === "jobtitle" || lower === "title") autoMap[header] = "job_title";
          else if (lower === "company" || lower === "currentcompany") autoMap[header] = "current_company";
          else if (lower === "linkedin" || lower === "linkedinurl") autoMap[header] = "linkedin_url";
          else if (lower === "github" || lower === "githuburl") autoMap[header] = "github_url";
          else if (lower === "country") autoMap[header] = "country";
          else if (lower === "languages") autoMap[header] = "languages";
          else autoMap[header] = "skip";
        }
        setMapping(autoMap);
        setStep("mapping");
      },
    });
  }

  function buildMappedRows(): { email: string; full_name: string; [key: string]: unknown }[] {
    return rows
      .map((row) => {
        const mapped: Record<string, unknown> = {};
        for (const [csvHeader, devField] of Object.entries(mapping)) {
          if (devField !== "skip" && row[csvHeader]) {
            mapped[devField] = row[csvHeader];
          }
        }
        return mapped;
      })
      .filter(
        (row) =>
          typeof row.email === "string" &&
          row.email.includes("@") &&
          typeof row.full_name === "string" &&
          row.full_name.length > 0
      ) as { email: string; full_name: string; [key: string]: unknown }[];
  }

  function handleImport() {
    const mappedRows = buildMappedRows();
    startTransition(async () => {
      const res = await importDevelopers(mappedRows, fileName);
      setResult(res);
      setStep("done");
    });
  }

  return (
    <div>
      <PageHeader title="Import Developers" description="Upload a CSV to bulk-import developer profiles" />

      {/* ===== STEP: UPLOAD ===== */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 rounded-md border-2 border-dashed p-12">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with developer data
              </p>
              <Label htmlFor="csv-file" className="cursor-pointer">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-64"
                />
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== STEP: COLUMN MAPPING ===== */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Map CSV Columns ({rows.length} rows found)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-4">
                  <span className="w-48 truncate text-sm font-medium">
                    {header}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={mapping[header] ?? "skip"}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [header]: v }))
                    }
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVELOPER_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep("preview")}>
                Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== STEP: PREVIEW ===== */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const mappedRows = buildMappedRows();
              const invalidCount = rows.length - mappedRows.length;
              return (
                <>
                  <div className="flex gap-4">
                    <Badge variant="default">{mappedRows.length} valid rows</Badge>
                    {invalidCount > 0 && (
                      <Badge variant="destructive">
                        {invalidCount} invalid (missing email or name)
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-96 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          {Object.entries(mapping)
                            .filter(
                              ([, v]) =>
                                v !== "skip" && v !== "email" && v !== "full_name"
                            )
                            .slice(0, 4)
                            .map(([, field]) => (
                              <TableHead key={field}>{field}</TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedRows.slice(0, 20).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">
                              {row.email as string}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.full_name as string}
                            </TableCell>
                            {Object.entries(mapping)
                              .filter(
                                ([, v]) =>
                                  v !== "skip" &&
                                  v !== "email" &&
                                  v !== "full_name"
                              )
                              .slice(0, 4)
                              .map(([, field]) => (
                                <TableCell
                                  key={field}
                                  className="text-sm text-muted-foreground"
                                >
                                  {String(row[field] ?? "—")}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {mappedRows.length > 20 && (
                    <p className="text-xs text-muted-foreground">
                      Showing first 20 of {mappedRows.length} rows
                    </p>
                  )}
                </>
              );
            })()}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleImport} disabled={isPending}>
                {isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== STEP: IMPORTING ===== */}
      {step === "importing" && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Importing developers...</p>
          </CardContent>
        </Card>
      )}

      {/* ===== STEP: DONE ===== */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Check className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default">{result.imported} imported</Badge>
              {result.skipped > 0 && (
                <Badge variant="secondary">
                  {result.skipped} skipped (duplicates)
                </Badge>
              )}
              {result.errors.length > 0 && (
                <Badge variant="destructive">{result.errors.length} errors</Badge>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md bg-destructive/5 p-3">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setStep("upload");
                setResult(null);
                setRows([]);
                setHeaders([]);
                setMapping({});
              }}
            >
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
