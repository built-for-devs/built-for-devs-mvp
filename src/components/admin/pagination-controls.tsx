"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PaginationControlsProps {
  totalItems: number;
  perPage?: number;
}

export function PaginationControls({
  totalItems,
  perPage = 25,
}: PaginationControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const totalPages = Math.ceil(totalItems / perPage);

  if (totalPages <= 1) return null;

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  }

  // Show at most 5 page numbers centered around current
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {Math.min((currentPage - 1) * perPage + 1, totalItems)}&ndash;
        {Math.min(currentPage * perPage, totalItems)} of {totalItems}
      </p>
      <nav role="navigation" aria-label="pagination" className="mx-auto flex w-full justify-center">
        <ul className="flex flex-row items-center gap-1">
          <li>
            <Link
              href={buildHref(Math.max(1, currentPage - 1))}
              aria-label="Go to previous page"
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 px-2.5 sm:pl-2.5",
                currentPage <= 1 && "pointer-events-none opacity-50"
              )}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="hidden sm:block">Previous</span>
            </Link>
          </li>
          {pages.map((page) => (
            <li key={page}>
              <Link
                href={buildHref(page)}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: page === currentPage ? "outline" : "ghost",
                    size: "icon",
                  })
                )}
              >
                {page}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={buildHref(Math.min(totalPages, currentPage + 1))}
              aria-label="Go to next page"
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 px-2.5 sm:pr-2.5",
                currentPage >= totalPages && "pointer-events-none opacity-50"
              )}
            >
              <span className="hidden sm:block">Next</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
