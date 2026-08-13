import { z } from "zod";

export const statusSchema = z.enum(["todo", "in_progress", "done"]);
export const prioritySchema = z.enum(["low", "medium", "high"]);
const dateSchema = z.iso.date();

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5_000).nullable().optional(),
    status: statusSchema.default("todo"),
    priority: prioritySchema.default("medium"),
    dueDate: dateSchema.nullable().optional(),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(20)
      .default([])
      .transform((tags) => [...new Set(tags)]),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5_000).nullable().optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    dueDate: dateSchema.nullable().optional(),
    tags: z
      .array(z.string().trim().min(1).max(40))
      .max(20)
      .transform((tags) => [...new Set(tags)])
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

export const listTasksSchema = z
  .object({
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    tag: z.string().trim().min(1).max(40).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    dueBefore: dateSchema.optional(),
    sort: z
      .enum(["createdAt", "updatedAt", "dueDate", "title"])
      .default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CreateTask = z.input<typeof createTaskSchema>;
export type TaskChanges = z.input<typeof updateTaskSchema>;
export type ListTasksQuery = z.output<typeof listTasksSchema>;

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: z.infer<typeof statusSchema>;
  priority: z.infer<typeof prioritySchema>;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
