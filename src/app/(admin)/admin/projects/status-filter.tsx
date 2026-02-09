"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectStatusOptions, formatEnumLabel } from "@/lib/admin/filter-options";

export function ProjectStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current || "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {projectStatusOptions.map((status) => (
          <SelectItem key={status} value={status}>
            {formatEnumLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
