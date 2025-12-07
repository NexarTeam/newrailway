const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filename) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf-8");
    return [];
  }
  const data = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJson(filename, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function findOne(filename, predicate) {
  const data = readJson(filename);
  return data.find(predicate);
}

function findMany(filename, predicate) {
  const data = readJson(filename);
  return data.filter(predicate);
}

function insertOne(filename, item) {
  const data = readJson(filename);
  data.push(item);
  writeJson(filename, data);
  return item;
}

function updateOne(filename, predicate, updates) {
  const data = readJson(filename);
  const index = data.findIndex(predicate);
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  writeJson(filename, data);
  return data[index];
}

function deleteOne(filename, predicate) {
  const data = readJson(filename);
  const index = data.findIndex(predicate);
  if (index === -1) return false;
  data.splice(index, 1);
  writeJson(filename, data);
  return true;
}

module.exports = {
  readJson,
  writeJson,
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne
};
