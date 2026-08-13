import { z } from "zod";

const environmentSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_PATH: z.string().min(1).default("./data/tiny-api.sqlite"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DOCS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export type AppConfig = {
  host: string;
  port: number;
  databasePath: string;
  logLevel: string;
  docsEnabled?: boolean;
};

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success)
    throw new Error(
      `Invalid environment configuration: ${z.prettifyError(result.error)}`,
    );
  return {
    host: result.data.HOST,
    port: result.data.PORT,
    databasePath: result.data.DATABASE_PATH,
    logLevel: result.data.LOG_LEVEL,
    docsEnabled: result.data.DOCS_ENABLED,
  };
}
