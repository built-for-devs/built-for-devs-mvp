"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FolkGroup {
  id: string;
  name: string;
}

export function GroupSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("group") ?? "";

  const [groups, setGroups] = useState<FolkGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/folk/groups")
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "none") {
      params.delete("group");
    } else {
      params.set("group", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (loading) {
    return (
      <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
    );
  }

  return (
    <Select value={current || "none"} onValueChange={handleChange}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a Folk group..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Select a group...</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
