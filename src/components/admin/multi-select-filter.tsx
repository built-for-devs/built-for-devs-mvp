"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatEnumLabel } from "@/lib/admin/filter-options";

interface MultiSelectFilterProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  compact?: boolean;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  compact = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function removeItem(value: string) {
    onChange(selected.filter((s) => s !== value));
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`justify-between text-xs font-normal ${compact ? "" : "w-full"}`}
          >
            {label}
            {selected.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-xs">
                {selected.length}
              </Badge>
            )}
            <ChevronsUpDown className="ml-auto h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
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
      {!compact && selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="gap-1 text-xs"
            >
              {formatEnumLabel(item)}
              <button onClick={() => removeItem(item)} className="hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
