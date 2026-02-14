"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Check, ChevronsUpDown, Linkedin, Github } from "lucide-react";
import { updateDeveloperProfile } from "@/lib/admin/actions";
import {
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  formatEnumLabel,
} from "@/lib/admin/filter-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";

interface DeveloperRowData {
  id: string;
  job_title: string | null;
  role_types: string[] | null;
  seniority: string | null;
  years_experience: number | null;
  languages: string[] | null;
  current_company: string | null;
  is_available: boolean;
  total_evaluations: number;
  linkedin_url: string | null;
  github_url: string | null;
  last_enriched_at: string | null;
  profiles: { full_name: string; email: string };
}

export function DeveloperRowEditor({
  dev,
  selected,
  onToggleSelect,
}: {
  dev: DeveloperRowData;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [roleTypes, setRoleTypes] = useState<string[]>(dev.role_types ?? []);
  const [seniority, setSeniority] = useState(dev.seniority ?? "");
  const [yearsExp, setYearsExp] = useState(dev.years_experience?.toString() ?? "");
  const [languages, setLanguages] = useState<string[]>(dev.languages ?? []);

  function handleSave() {
    startTransition(async () => {
      await updateDeveloperProfile(dev.id, {
        role_types: roleTypes,
        seniority: seniority || undefined,
        years_experience: yearsExp ? parseInt(yearsExp) : undefined,
        languages,
      });
      setEditing(false);
    });
  }

  function handleCancel() {
    setRoleTypes(dev.role_types ?? []);
    setSeniority(dev.seniority ?? "");
    setYearsExp(dev.years_experience?.toString() ?? "");
    setLanguages(dev.languages ?? []);
    setEditing(false);
  }

  return (
    <TableRow key={dev.id}>
      {onToggleSelect !== undefined && (
        <TableCell>
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
        </TableCell>
      )}
      {/* Name */}
      <TableCell>
        <Link
          href={`/admin/developers/${dev.id}`}
          className="font-medium hover:underline"
        >
          {dev.profiles.full_name}
        </Link>
        <p className="text-xs text-muted-foreground">{dev.profiles.email}</p>
      </TableCell>

      {/* Social Links */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          {dev.linkedin_url && (
            <a
              href={dev.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          )}
          {dev.github_url && (
            <a
              href={dev.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
          )}
        </div>
      </TableCell>

      {/* Job Title */}
      <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground" title={dev.job_title ?? undefined}>
        {dev.job_title ?? "—"}
      </TableCell>

      {/* Company */}
      <TableCell className="text-sm text-muted-foreground">
        {dev.current_company ?? "—"}
      </TableCell>

      {/* Role Types — editable */}
      <TableCell>
        {editing ? (
          <MultiSelectInline
            options={roleTypeOptions}
            selected={roleTypes}
            onChange={setRoleTypes}
            label="Roles"
          />
        ) : (
          <div className="flex flex-wrap gap-1">
            {(dev.role_types ?? []).slice(0, 2).map((rt) => (
              <Badge key={rt} variant="secondary" className="text-xs">
                {rt}
              </Badge>
            ))}
            {(dev.role_types?.length ?? 0) > 2 && (
              <Badge variant="outline" className="text-xs">
                +{(dev.role_types?.length ?? 0) - 2}
              </Badge>
            )}
            {(dev.role_types ?? []).length === 0 && (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        )}
      </TableCell>

      {/* Seniority — editable */}
      <TableCell>
        {editing ? (
          <Select value={seniority} onValueChange={setSeniority}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {seniorityOptions.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {formatEnumLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm">
            {dev.seniority ? formatEnumLabel(dev.seniority) : "—"}
          </span>
        )}
      </TableCell>

      {/* Exp — editable */}
      <TableCell>
        {editing ? (
          <Input
            type="number"
            min="0"
            max="50"
            value={yearsExp}
            onChange={(e) => setYearsExp(e.target.value)}
            className="h-8 w-16 text-xs"
          />
        ) : (
          <span className="text-sm">
            {dev.years_experience != null ? `${dev.years_experience}y` : "—"}
          </span>
        )}
      </TableCell>

      {/* Languages — editable */}
      <TableCell>
        {editing ? (
          <MultiSelectInline
            options={languageOptions}
            selected={languages}
            onChange={setLanguages}
            label="Languages"
          />
        ) : (
          <div className="flex flex-wrap gap-1">
            {(dev.languages ?? []).slice(0, 3).map((lang) => (
              <Badge key={lang} variant="outline" className="text-xs">
                {lang}
              </Badge>
            ))}
            {(dev.languages?.length ?? 0) > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(dev.languages?.length ?? 0) - 3}
              </Badge>
            )}
            {(dev.languages ?? []).length === 0 && (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        )}
      </TableCell>

      {/* Available */}
      <TableCell>
        <Badge
          variant={dev.is_available ? "default" : "secondary"}
          className="text-xs"
        >
          {dev.is_available ? "Yes" : "No"}
        </Badge>
      </TableCell>

      {/* Enriched */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {dev.last_enriched_at
          ? new Date(dev.last_enriched_at).toLocaleDateString()
          : "—"}
      </TableCell>

      {/* Evals + Edit button */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm">{dev.total_evaluations}</span>
          {editing ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "..." : "Save"}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// Compact multi-select for inline editing
function MultiSelectInline({
  options,
  selected,
  onChange,
  label,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-between text-xs font-normal"
        >
          {selected.length > 0 ? `${selected.length} selected` : label}
          <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search...`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => toggle(option)}
                >
                  <div
                    className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                      selected.includes(option)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted"
                    }`}
                  >
                    {selected.includes(option) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  {formatEnumLabel(option)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
