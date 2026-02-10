import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDevEvaluation } from "@/lib/dev/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationStatusBar } from "./evaluation-status-bar";
import { ClarityFlowEmbed } from "@/components/clarityflow-embed";
import { buildConversationUrl } from "@/lib/clarityflow";

export default async function DevEvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const evaluation = await getDevEvaluation(supabase, id);

  if (!evaluation) {
    notFound();
  }

  const project = evaluation.projects as {
    product_name: string;
    product_description: string | null;
    product_url: string | null;
    evaluation_scope: string | null;
    setup_instructions: string | null;
    time_to_value_milestone: string | null;
    goals: string[] | null;
  };

  return (
    <div className="space-y-6">
      {/* Assignment Context */}
      <div>
        <h1 className="text-2xl font-semibold">{project.product_name}</h1>
        {project.product_description && (
          <p className="mt-1 text-muted-foreground">
            {project.product_description}
          </p>
        )}
        {project.product_url && (
          <p className="mt-1 text-sm">
            <a
              href={project.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {project.product_url}
            </a>
          </p>
        )}
      </div>

      {/* Project Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {project.evaluation_scope && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Evaluation Scope
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{project.evaluation_scope}</p>
            </CardContent>
          </Card>
        )}

        {project.setup_instructions && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {project.setup_instructions}
              </p>
            </CardContent>
          </Card>
        )}

        {project.time_to_value_milestone && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Time-to-Value Milestone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{project.time_to_value_milestone}</p>
            </CardContent>
          </Card>
        )}

        {project.goals && project.goals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {project.goals.map((goal) => (
                  <Badge key={goal} variant="secondary">
                    {goal}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ClarityFlow Recording */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evaluation Recording</CardTitle>
        </CardHeader>
        <CardContent>
          {evaluation.status === "invited" ? (
            <div className="rounded-md border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Accept this invitation to start your recording.
              </p>
            </div>
          ) : evaluation.status === "accepted" &&
            evaluation.clarityflow_conversation_id ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-8 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Make sure your microphone and screen recording are turned on
                  before you get started.
                </p>
                <Button asChild size="lg">
                  <a
                    href={buildConversationUrl(
                      evaluation.clarityflow_conversation_id
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Start Recording
                  </a>
                </Button>
              </div>
            </div>
          ) : evaluation.recording_embed_url &&
            ["submitted", "in_review", "approved", "rejected", "paid"].includes(
              evaluation.status
            ) ? (
            <ClarityFlowEmbed embedUrl={evaluation.recording_embed_url} />
          ) : (
            <div className="rounded-md border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Recording is being set up. Please check back shortly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Bar */}
      <EvaluationStatusBar evaluation={evaluation} />
    </div>
  );
}
