import { z } from 'zod';

export const LabResultItemSchema = z.object({
  lab_order_item_id: z.string().uuid("Invalid lab_order_item_id format (must be UUID)"),
  result_value: z.string().min(1, "Result value is required"),
  unit: z.string().optional().default(""),
  normal_range: z.string().optional().default(""),
  status: z.enum(["PRELIMINARY", "FINAL"]).default("FINAL"),
  notes: z.string().optional(),
});

export const LabResultsIngestSchema = z.object({
  idempotency_key: z.string().min(8, "idempotency_key must be at least 8 characters"),
  lab_order_id: z.string().uuid("Invalid lab_order_id format (must be UUID)"),
  verified_by: z.string().optional().default("Lab Analyzer Gateway"),
  results: z.array(LabResultItemSchema).min(1, "At least one lab result item is required"),
});

export type LabResultsIngestInput = z.infer<typeof LabResultsIngestSchema>;
