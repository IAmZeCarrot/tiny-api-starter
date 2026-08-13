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

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };
const nullableDate = {
  anyOf: [{ type: "string", format: "date" }, { type: "null" }],
};

export const taskJsonSchema = {
  type: "object",
  required: [
    "id",
    "title",
    "description",
    "status",
    "priority",
    "dueDate",
    "tags",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "integer", minimum: 1, example: 1 },
    title: { type: "string", example: "Ship the API" },
    description: { ...nullableString, example: "Publish version 1.0" },
    status: { type: "string", enum: statusSchema.options, example: "todo" },
    priority: {
      type: "string",
      enum: prioritySchema.options,
      example: "high",
    },
    dueDate: { ...nullableDate, example: "2026-09-01" },
    tags: {
      type: "array",
      items: { type: "string" },
      example: ["release"],
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

export const createTaskJsonSchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      minLength: 1,
      maxLength: 200,
      example: "Ship the API",
    },
    description: {
      anyOf: [{ type: "string", maxLength: 5_000 }, { type: "null" }],
      example: "Publish version 1.0",
    },
    status: { type: "string", enum: statusSchema.options, default: "todo" },
    priority: {
      type: "string",
      enum: prioritySchema.options,
      default: "medium",
    },
    dueDate: { ...nullableDate, example: "2026-09-01" },
    tags: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 40 },
      example: ["release"],
    },
  },
} as const;

export const updateTaskJsonSchema = {
  type: "object",
  required: [],
  minProperties: 1,
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    description: {
      anyOf: [{ type: "string", maxLength: 5_000 }, { type: "null" }],
    },
    status: { type: "string", enum: statusSchema.options },
    priority: { type: "string", enum: prioritySchema.options },
    dueDate: nullableDate,
    tags: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 40 },
    },
  },
} as const;

export const listTasksJsonSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: statusSchema.options },
    priority: { type: "string", enum: prioritySchema.options },
    tag: { type: "string", minLength: 1, maxLength: 40 },
    q: { type: "string", minLength: 1, maxLength: 200 },
    dueBefore: { type: "string", format: "date" },
    sort: {
      type: "string",
      enum: ["createdAt", "updatedAt", "dueDate", "title"],
      default: "createdAt",
    },
    order: { type: "string", enum: ["asc", "desc"], default: "desc" },
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
} as const;

export const taskIdJsonSchema = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "integer", minimum: 1 } },
} as const;
