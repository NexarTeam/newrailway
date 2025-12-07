import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "server", "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readJson<T>(filename: string): T[] {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf-8");
    return [];
  }
  const data = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

export function writeJson<T>(filename: string, data: T[]): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function findOne<T extends Record<string, any>>(
  filename: string,
  predicate: (item: T) => boolean
): T | undefined {
  const data = readJson<T>(filename);
  return data.find(predicate);
}

export function findMany<T extends Record<string, any>>(
  filename: string,
  predicate: (item: T) => boolean
): T[] {
  const data = readJson<T>(filename);
  return data.filter(predicate);
}

export function insertOne<T>(filename: string, item: T): T {
  const data = readJson<T>(filename);
  data.push(item);
  writeJson(filename, data);
  return item;
}

export function updateOne<T extends Record<string, any>>(
  filename: string,
  predicate: (item: T) => boolean,
  updates: Partial<T>
): T | null {
  const data = readJson<T>(filename);
  const index = data.findIndex(predicate);
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  writeJson(filename, data);
  return data[index];
}

export function deleteOne<T extends Record<string, any>>(
  filename: string,
  predicate: (item: T) => boolean
): boolean {
  const data = readJson<T>(filename);
  const index = data.findIndex(predicate);
  if (index === -1) return false;
  data.splice(index, 1);
  writeJson(filename, data);
  return true;
}
