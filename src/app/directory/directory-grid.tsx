"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  classificationStyles,
  classificationLabels,
} from "@/lib/score/classification";
import type { Classification } from "@/lib/score/types";
import type { DirectoryProduct } from "@/lib/directory/queries";

interface Props {
  products: DirectoryProduct[];
}

export function DirectoryGrid({ products }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const evaluation = product.full_evaluation as Record<
          string,
          unknown
        > | null;
        const productName =
          (evaluation?.product_name as string) ?? product.target_domain;
        const classification = product.classification as Classification;
        const delta =
          product.previous_score != null
            ? product.final_score - product.previous_score
            : null;

        return (
          <Link key={product.id} href={`/score/${product.slug}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.target_domain}
                    </p>
                    {product.company_name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {product.company_name}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-2xl font-bold tabular-nums">
                      {product.final_score}
                    </span>
                    <span className="text-sm text-muted-foreground">/120</span>
                    {delta !== null && (
                      <div
                        className={`mt-1 flex items-center justify-end gap-0.5 text-xs font-medium ${
                          delta > 0
                            ? "text-green-600"
                            : delta < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {delta > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : delta < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {delta > 0 ? `+${delta}` : delta === 0 ? "0" : delta}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <Badge
                    variant="outline"
                    className={`border-transparent ${
                      classificationStyles[classification] ?? ""
                    }`}
                  >
                    {classificationLabels[classification] ??
                      product.classification}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
