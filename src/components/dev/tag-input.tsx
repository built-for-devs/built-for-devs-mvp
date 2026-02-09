"use client";

import { useState, useRef } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatEnumLabel } from "@/lib/admin/filter-options";

interface TagInputProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Combine predefined options with any custom values already selected
  const allOptions = [
    ...options,
    ...selected.filter((s) => !options.includes(s)),
  ];

  const normalizedSearch = search.toLowerCase().trim();
  const filteredOptions = allOptions.filter((opt) =>
    opt.toLowerCase().includes(normalizedSearch)
  );

  // Show "Add" option if search doesn't exactly match any existing option
  const exactMatch = allOptions.some(
    (opt) => opt.toLowerCase() === normalizedSearch
  );
  const showAddOption = normalizedSearch.length > 0 && !exactMatch;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function addCustom() {
    const value = search.trim().toLowerCase().replace(/\s+/g, "-");
    if (value && !selected.includes(value)) {
      onChange([...selected, value]);
    }
    setSearch("");
  }

  function remove(value: string) {
    onChange(selected.filter((s) => s !== value));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            size="sm"
            className="w-full justify-between text-sm font-normal"
          >
            {placeholder ?? `Select ${label.toLowerCase()}...`}
            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search or add ${label.toLowerCase()}...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandGroup>
                {filteredOptions.map((option) => (
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
                {showAddOption && (
                  <CommandItem onSelect={addCustom} className="text-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add &quot;{search.trim()}&quot;
                  </CommandItem>
                )}
                {filteredOptions.length === 0 && !showAddOption && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 text-xs">
              {formatEnumLabel(item)}
              <button
                type="button"
                onClick={() => remove(item)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
