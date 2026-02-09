"use client";

import { useState, useTransition } from "react";
import {
  updateDeveloperAvailability,
  updateDeveloperQualityRating,
  updateDeveloperNotes,
} from "@/lib/admin/actions";
import { NotesEditor } from "@/components/admin/notes-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DeveloperWithProfile } from "@/types/admin";

export function DeveloperAdminPanel({
  developer,
}: {
  developer: DeveloperWithProfile;
}) {
  const [available, setAvailable] = useState(developer.is_available);
  const [rating, setRating] = useState(
    developer.quality_rating?.toString() ?? ""
  );
  const [isPending, startTransition] = useTransition();

  function handleAvailabilityChange(checked: boolean) {
    setAvailable(checked);
    startTransition(async () => {
      await updateDeveloperAvailability(developer.id, checked);
    });
  }

  function handleRatingSave() {
    const value = parseFloat(rating);
    if (isNaN(value) || value < 1 || value > 5) return;
    startTransition(async () => {
      await updateDeveloperQualityRating(developer.id, value);
    });
  }

  return (
    <div className="space-y-6">
      {/* Availability & Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Availability</Label>
              <p className="text-xs text-muted-foreground">
                Whether this developer can receive new invitations
              </p>
            </div>
            <Switch
              checked={available}
              onCheckedChange={handleAvailabilityChange}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Quality Rating (1.00 - 5.00)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="5"
                step="0.01"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-32"
              />
              <Button size="sm" onClick={handleRatingSave} disabled={isPending}>
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesEditor
            initialValue={developer.admin_notes}
            onSave={(notes) => updateDeveloperNotes(developer.id, notes)}
          />
        </CardContent>
      </Card>

      {/* Meta info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Profile Complete</dt>
              <dd>
                <Badge variant={developer.profile_complete ? "default" : "secondary"}>
                  {developer.profile_complete ? "Yes" : "No"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Imported</dt>
              <dd>
                <Badge variant={developer.imported ? "default" : "secondary"}>
                  {developer.imported ? "Yes" : "No"}
                </Badge>
                {developer.import_source && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    from {developer.import_source}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(developer.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{new Date(developer.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
