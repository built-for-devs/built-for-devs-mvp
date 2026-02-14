import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ActivityEntry {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  profiles: { full_name: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  enriched: "Enriched",
  edited_profile: "Edited profile",
  updated_notes: "Updated notes",
  updated_availability: "Updated availability",
  updated_quality_rating: "Updated quality rating",
};

function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === "enriched") {
    const fields = details.fields_updated as string[] | undefined;
    return fields ? `${fields.length} fields updated` : "Enriched";
  }
  if (action === "edited_profile") {
    const fields = details.fields as string[] | undefined;
    return fields ? fields.join(", ") : "Profile updated";
  }
  if (action === "updated_availability") {
    return details.is_available ? "Set available" : "Set unavailable";
  }
  if (action === "updated_quality_rating") {
    return `Rating: ${details.rating}`;
  }
  return "";
}

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">
                  {entry.profiles?.full_name ?? "System"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDetails(entry.action, entry.details)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
