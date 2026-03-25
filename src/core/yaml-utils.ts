import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import process from "node:process";
import { dirname, basename, join } from "node:path";
import { parse, stringify } from "yaml";

export class YamlValidationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly validationErrors: ValidationError[],
  ) {
    const summary = validationErrors.map((e) => `  - ${e.field}: ${e.message}`).join("\n");
    super(`Invalid YAML in ${basename(filePath)}:\n${summary}`);
    this.name = "YamlValidationError";
  }
}

export class YamlParseError extends Error {
  constructor(
    public readonly filePath: string,
    cause: unknown,
  ) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to parse ${basename(filePath)}: ${msg}`);
    this.name = "YamlParseError";
  }
}

export type Validator = (data: unknown) => ValidationResult;

export async function readYaml<T>(filePath: string, validator?: Validator): Promise<T> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    throw err;
  }

  let data: T;
  try {
    data = parse(content, { strict: true, uniqueKeys: true }) as T;
  } catch (cause) {
    throw new YamlParseError(filePath, cause);
  }

  if (validator) {
    const result = validator(data);
    if (!result.valid) {
      throw new YamlValidationError(filePath, result.errors);
    }
  }

  return data;
}

export async function writeYaml<T>(filePath: string, data: T, validator?: Validator): Promise<void> {
  if (validator) {
    const result = validator(data);
    if (!result.valid) {
      throw new YamlValidationError(filePath, result.errors);
    }
  }

  await mkdir(dirname(filePath), { recursive: true });
  const content = stringify(data, { lineWidth: 0 });
  const tmpPath = join(dirname(filePath), `.tmp.${process.pid}.${Date.now()}`);
  try {
    await writeFile(tmpPath, content, "utf-8");
    await rename(tmpPath, filePath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

export function fail(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}

export function requireString(
  obj: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
): void {
  if (typeof obj[field] !== "string" || obj[field] === "") {
    errors.push({ field, message: `${field} must be a non-empty string` });
  }
}

export function requireArray(
  obj: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
): void {
  if (!Array.isArray(obj[field])) {
    errors.push({ field, message: `${field} must be an array` });
  }
}

export function optionalString(
  obj: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
): void {
  const val = obj[field];
  if (val !== undefined && val !== null && typeof val !== "string") {
    errors.push({ field, message: `${field} must be a string or null` });
  }
}
