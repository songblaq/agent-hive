import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { parse, stringify } from "yaml";

export async function readYaml<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf-8");
  return parse(content) as T;
}

export async function writeYaml<T>(filePath: string, data: T): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const content = stringify(data, { lineWidth: 0 });
  await writeFile(filePath, content, "utf-8");
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
