import { PageHeader } from "@/components/admin/page-header";
import { AdminScoreForm } from "./admin-score-form";

export default function AdminNewScorePage() {
  return (
    <div>
      <PageHeader
        title="Submit Score"
        description="Run a Developer Adoption Score without rate limiting."
      />
      <div className="max-w-lg">
        <AdminScoreForm />
      </div>
    </div>
  );
}
