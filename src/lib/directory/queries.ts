import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export interface DirectoryProduct {
  id: string;
  slug: string;
  target_url: string;
  target_domain: string;
  final_score: number;
  classification: string;
  full_evaluation: Record<string, unknown>;
  company_name: string | null;
  completed_at: string;
  created_at: string;
}

export interface DirectoryFilters {
  search?: string;
  classification?: string;
  page?: number;
  per_page?: number;
}

export async function getDirectoryProducts(
  filters: DirectoryFilters
): Promise<{ data: DirectoryProduct[]; count: number }> {
  const supabase = createServiceClient() as any;
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 24;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("directory_products")
    .select(
      "id, slug, target_url, target_domain, final_score, classification, full_evaluation, company_name, completed_at",
      { count: "exact" }
    );

  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(`target_domain.ilike.${s},company_name.ilike.${s}`);
  }

  if (filters.classification) {
    query = query.eq("classification", filters.classification);
  }

  query = query.order("final_score", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("getDirectoryProducts error:", error);
    return { data: [], count: 0 };
  }

  return {
    data: (data as unknown as DirectoryProduct[]) ?? [],
    count: count ?? 0,
  };
}
