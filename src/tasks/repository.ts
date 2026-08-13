import type { SqliteDatabase } from "../database.js";
import type {
  CreateTask,
  ListTasksQuery,
  Task,
  TaskChanges,
} from "./schema.js";

interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  status: Task["status"];
  priority: Task["priority"];
  due_date: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

const columns =
  "id, title, description, status, priority, due_date, tags, created_at, updated_at";

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TaskRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(
    input: Required<
      Pick<CreateTask, "title" | "status" | "priority" | "tags">
    > &
      CreateTask,
  ): Task {
    const now = new Date().toISOString();
    const result = this.database
      .prepare(
        `INSERT INTO tasks (title, description, status, priority, due_date, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.title,
        input.description ?? null,
        input.status,
        input.priority,
        input.dueDate ?? null,
        JSON.stringify(input.tags),
        now,
        now,
      );
    return this.get(Number(result.lastInsertRowid))!;
  }

  get(id: number): Task | undefined {
    const row = this.database
      .prepare(`SELECT ${columns} FROM tasks WHERE id = ?`)
      .get(id) as TaskRow | undefined;
    return row ? mapTask(row) : undefined;
  }

  list(query: ListTasksQuery): {
    data: Task[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (query.status) {
      conditions.push("status = ?");
      values.push(query.status);
    }
    if (query.priority) {
      conditions.push("priority = ?");
      values.push(query.priority);
    }
    if (query.tag) {
      conditions.push(
        "EXISTS (SELECT 1 FROM json_each(tasks.tags) WHERE json_each.value = ?)",
      );
      values.push(query.tag);
    }
    if (query.q) {
      conditions.push(
        "(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')",
      );
      const escaped = `%${query.q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
      values.push(escaped, escaped);
    }
    if (query.dueBefore) {
      conditions.push("due_date <= ?");
      values.push(query.dueBefore);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortColumns = {
      createdAt: "created_at",
      updatedAt: "updated_at",
      dueDate: "due_date",
      title: "title",
    } as const;
    const total = (
      this.database
        .prepare(`SELECT COUNT(*) AS count FROM tasks ${where}`)
        .get(...values) as { count: number }
    ).count;
    const offset = (query.page - 1) * query.limit;
    const rows = this.database
      .prepare(
        `SELECT ${columns} FROM tasks ${where} ORDER BY ${sortColumns[query.sort]} ${query.order.toUpperCase()}, id ${query.order.toUpperCase()} LIMIT ? OFFSET ?`,
      )
      .all(...values, query.limit, offset) as TaskRow[];
    return {
      data: rows.map(mapTask),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  update(id: number, changes: TaskChanges): Task | undefined {
    if (!this.get(id)) return undefined;
    const map = {
      title: "title",
      description: "description",
      status: "status",
      priority: "priority",
      dueDate: "due_date",
      tags: "tags",
    } as const;
    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(map) as [
      keyof typeof map,
      string,
    ][]) {
      if (!(key in changes)) continue;
      assignments.push(`${column} = ?`);
      const value = changes[key];
      values.push(key === "tags" ? JSON.stringify(value) : (value ?? null));
    }
    assignments.push("updated_at = ?");
    values.push(new Date().toISOString(), id);
    this.database
      .prepare(`UPDATE tasks SET ${assignments.join(", ")} WHERE id = ?`)
      .run(...values);
    return this.get(id);
  }

  delete(id: number): boolean {
    return (
      this.database.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes >
      0
    );
  }
}
