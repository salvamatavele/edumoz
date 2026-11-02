import { TENANT_MODEL_METADATA } from "./tenant-model-metadata";

type RecordValue = Record<string, unknown>;
interface Relation { target: string; field: string; reference: string; many: boolean; }
interface Metadata { schoolPath: readonly string[] | null; relations: Record<string, Relation>; }
const models: Record<string, Metadata> = TENANT_MODEL_METADATA;
const reads = new Set(["aggregate", "count", "findFirst", "findFirstOrThrow", "findMany", "findUnique", "findUniqueOrThrow", "groupBy"]);
const whereOperations = new Set([...reads, "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany", "upsert"]);
const creates = new Set(["create", "createMany", "createManyAndReturn"]);
const publicUserFields = new Set(["id", "name", "email", "image"]);
function record(value: unknown): RecordValue { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : {}; }
function mapValues(value: unknown, transform: (item: unknown) => unknown): unknown { return Array.isArray(value) ? value.map(transform) : transform(value); }
function fail(message: string): never { throw new Error(`TENANT_SCOPE ${message}`); }
function scope(model: string, schoolId: string): RecordValue {
  const path = models[model]?.schoolPath;
  if (!path) return fail(`No school scope for ${model}`);
  return path.reduceRight<RecordValue>((value, field, index) => ({ [field]: index === path.length - 1 ? schoolId : value }), {});
}
function scopedWhere(model: string, value: unknown, schoolId: string): RecordValue {
  const where = record(value);
  const filter = scope(model, schoolId);
  if (models[model].schoolPath?.length === 1) return { ...where, ...filter };
  return { ...where, AND: [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), filter] };
}
function nestedMutation(model: string, value: unknown, schoolId: string): unknown {
  const operations = { ...record(value) };
  for (const [operation, input] of Object.entries(operations)) {
    if (operation === "create") operations[operation] = mapValues(input, data => prepareData(model, data, schoolId, true));
    else if (operation === "createMany") operations[operation] = { ...record(input), data: mapValues(record(input).data, data => prepareData(model, data, schoolId, true)) };
    else if (operation === "connectOrCreate" || operation === "upsert") {
      operations[operation] = mapValues(input, item => {
        const entry = record(item);
        return { ...entry, ...(entry.where ? { where: scopedWhere(model, entry.where, schoolId) } : {}),
          create: prepareData(model, entry.create, schoolId, true),
          ...(operation === "upsert" ? { update: prepareData(model, entry.update, schoolId, false) } : {}),
        };
      });
    } else if (operation === "update" || operation === "updateMany") {
      operations[operation] = mapValues(input, item => {
        const entry = record(item);
        return "data" in entry
          ? { ...entry, ...(entry.where || operation === "updateMany" ? { where: scopedWhere(model, entry.where, schoolId) } : {}), data: prepareData(model, entry.data, schoolId, false) }
          : prepareData(model, entry, schoolId, false);
      });
    } else if (["connect", "set", "deleteMany"].includes(operation) || (["delete", "disconnect"].includes(operation) && typeof input !== "boolean")) {
      operations[operation] = mapValues(input, where => scopedWhere(model, where, schoolId));
    } else if (!["delete", "disconnect"].includes(operation)) fail(`Unsupported nested operation ${model}.${operation}`);
  }
  return operations;
}
function prepareData(model: string, input: unknown, schoolId: string, create: boolean): RecordValue {
  const data = { ...record(input) };
  if ("school" in data && data.school !== undefined) fail(`${model}.school writes are forbidden; use schoolId`);
  if ("schoolId" in data && data.schoolId !== undefined) {
    const value = data.schoolId;
    const set = record(value);
    if (value !== schoolId && (create || Object.keys(set).length !== 1 || set.set !== schoolId)) fail(`Cannot change ${model}.schoolId`);
  }
  if (create && models[model].schoolPath?.[0] === "schoolId") data.schoolId = schoolId;
  for (const [field, relation] of Object.entries(models[model].relations)) {
    if (data[field] === undefined) continue;
    if (!models[relation.target].schoolPath || relation.target === "School") fail(`Global relation mutation ${model}.${field} is forbidden`);
    data[field] = nestedMutation(relation.target, data[field], schoolId);
  }
  return data;
}
function prepareReadRelations(model: string, args: RecordValue, schoolId: string): RecordValue {
  const result = { ...args };
  for (const kind of ["select", "include"]) {
    if (!args[kind]) continue;
    const selection = { ...record(args[kind]) };
    for (const [field, input] of Object.entries(selection)) {
      if (!input) continue;
      if (field === "_count") {
        const requested = input === true ? Object.fromEntries(Object.entries(models[model].relations).filter(([, rel]) => rel.many).map(([key]) => [key, true])) : record(record(input).select);
        selection[field] = { select: Object.fromEntries(Object.entries(requested).map(([key, count]) => {
          const target = models[model].relations[key]?.target;
          return [key, target && models[target].schoolPath && count ? { ...record(count), where: scopedWhere(target, record(count).where, schoolId) } : count];
        })) };
        continue;
      }
      const relation = models[model].relations[field];
      if (!relation) continue;
      if (relation.target === "User") {
        const fields = record(record(input).select);
        if (input === true || record(input).include || !Object.keys(fields).length || Object.entries(fields).some(([key, selected]) => selected && !publicUserFields.has(key))) fail(`User relation ${model}.${field} requires a safe explicit select`);
      } else if (!models[relation.target].schoolPath && relation.target !== "Permission") fail(`Global relation ${model}.${field} is forbidden`);
      let child = prepareReadRelations(relation.target, record(input), schoolId);
      if (relation.many && models[relation.target].schoolPath) child = { ...child, where: scopedWhere(relation.target, child.where, schoolId) };
      selection[field] = Object.keys(child).length ? child : true;
    }
    result[kind] = selection;
  }
  return result;
}
export function prepareTenantQuery(model: string | undefined, operation: string, input: unknown, schoolId: string): RecordValue {
  if (!model) return fail("Raw SQL is unavailable in the school client");
  const metadata = models[model];
  if (!metadata) return fail(`Unknown model ${model}`);
  if (!metadata.schoolPath && !(model === "Permission" && reads.has(operation))) return fail(`Global model ${model} is unavailable in the school client`);
  if (model === "School" && !reads.has(operation)) return fail("School administration requires its authorized global boundary");
  let args = { ...record(input) };
  if (metadata.schoolPath && whereOperations.has(operation)) args.where = scopedWhere(model, args.where, schoolId);
  if (creates.has(operation) || operation === "upsert") {
    if (metadata.schoolPath && metadata.schoolPath.length > 1) return fail(`Create ${model} through its scoped parent`);
    const key = operation === "upsert" ? "create" : "data";
    args[key] = mapValues(args[key], data => prepareData(model, data, schoolId, true));
  }
  if (["update", "updateMany", "updateManyAndReturn", "upsert"].includes(operation)) {
    const key = operation === "upsert" ? "update" : "data";
    args[key] = prepareData(model, args[key], schoolId, false);
  }
  args = prepareReadRelations(model, args, schoolId);
  return args;
}
