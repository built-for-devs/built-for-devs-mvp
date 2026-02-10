import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyForUser, getCompanyEvaluation } from "@/lib/company/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "./copy-button";
import { ClarityFlowEmbed } from "@/components/clarityflow-embed";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const statusColors: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  in_review: "bg-yellow-100 text-yellow-700",
  submitted: "bg-blue-100 text-blue-700",
  recording: "bg-indigo-100 text-indigo-700",
  accepted: "bg-purple-100 text-purple-700",
};

export default async function CompanyEvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: projectId, evalId } = await params;
  const supabase = await createClient();
  const companyData = await getCompanyForUser(supabase);

  if (!companyData) redirect("/company/onboarding");

  const evaluation = await getCompanyEvaluation(supabase, projectId, evalId);
  if (!evaluation) notFound();

  const descriptor = evaluation.anonymous_descriptor ?? "Anonymous Developer";
  const status = evaluation.status ?? "unknown";
  const completedAt = evaluation.recording_completed_at;
  const recordingUrl = evaluation.recording_embed_url;
  const transcript = evaluation.transcript;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/company/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{descriptor}</h1>
          {completedAt && (
            <p className="mt-1 text-sm text-muted-foreground">
              Completed {new Date(completedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={statusColors[status] ?? ""}
        >
          {formatEnumLabel(status)}
        </Badge>
      </div>

      {/* ClarityFlow Recording */}
      {recordingUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <ClarityFlowEmbed embedUrl={recordingUrl} />
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {transcript && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transcript</CardTitle>
            <CopyButton text={transcript} label="Copy Transcript" />
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto rounded-lg bg-muted p-4">
              <p className="text-sm whitespace-pre-wrap">{transcript}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No content yet */}
      {!transcript && !recordingUrl && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              This evaluation is still in progress. Content will appear here once
              the developer completes their recording.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
