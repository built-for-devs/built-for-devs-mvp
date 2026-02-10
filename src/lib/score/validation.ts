import { z } from "zod";

export const scoreSubmitSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .transform((val) => {
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(z.string().url("Please enter a valid URL"))
    .refine(
      (val) => {
        try {
          const url = new URL(val);
          const hostname = url.hostname;
          return (
            !hostname.includes("localhost") &&
            !hostname.match(/^\d+\.\d+\.\d+\.\d+$/) &&
            !hostname.endsWith(".local") &&
            hostname.includes(".")
          );
        } catch {
          return false;
        }
      },
      { message: "Please enter a public website URL" }
    ),
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  company_name: z.string().optional(),
});

export type ScoreSubmitInput = z.infer<typeof scoreSubmitSchema>;
