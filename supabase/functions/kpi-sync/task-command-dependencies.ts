type DependencyState = Record<string, unknown>;
const taskDependencyContextKey = Symbol("task-dependency-context");
export const taskIndependentRoots = ["bulletins", "archiveRecords", "publicInvestmentProjects", "publicInvestmentAppraisals",
  "evaluations", "departmentEvaluations", "supportRequests"] as const;
class TaskDependencyAccess extends Error {}
export class TaskMetadataRequired extends Error {}
export const taskColdFields = ["id", "kind", "taskKind", "assignedById", "assignedAt", "responseStatus", "responseAt",
  "ownerId", "collaboratorId", "collaboratorIds", "gpmbWorkflowId", "gpmbStepId", "projectId", "projectName", "category",
  "recurrence", "periodicity", "recurrenceSourceId", "recurrenceSeriesId", "recurrenceStoppedAt", "recurrenceStopDate",
  "status", "completionReviewStatus", "dependencyIds"] as const;
export type TaskFieldReads = Record<string, Record<string, { present: boolean; value?: unknown }>>;
type TaskReadTrace = { taskId: string; reads: TaskFieldReads; invalid?: boolean };
type ColdProjection = { taskId: string; invalid: boolean; creating?: boolean };
type DependencyContext = { raw: DependencyState; trace?: TaskReadTrace; validity: { invalid: boolean }; projection?: ColdProjection; restricted: boolean };
const trackedTasks = new WeakMap<object, { raw: DependencyState; trace?: TaskReadTrace; projection?: ColdProjection }>();
const dependencyObject = (value: unknown): value is DependencyState => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export function ordinaryDependencyTask(task: DependencyState | undefined): boolean {
  return Boolean(task && task.kind === "regular" && ["", "none"].includes(String(task.recurrence || task.periodicity || ""))
    && !["gpmbWorkflowId", "gpmbStepId", "recurrenceSourceId", "recurrenceSeriesId", "recurrenceStoppedAt", "recurrenceStopDate", "sourceCalendarEventId"].some((key) => Boolean(task[key])));
}
function dependencyContext(value: unknown): DependencyContext | undefined {
  return value && typeof value === "object" ? Reflect.get(value, taskDependencyContextKey) : undefined;
}
function guardTaskDependencies(raw: DependencyState, trace?: TaskReadTrace, validity = { invalid: false }, projection?: ColdProjection, restricted = true): DependencyState {
  const reject = (message: string): never => { validity.invalid = true; if (trace) trace.invalid = true; throw new TaskDependencyAccess(message); };
  const missing = (message: string): never => { if (projection) { projection.invalid = true; throw new TaskMetadataRequired(message); } return reject(message); };
  const siblingReject = projection ? missing : reject;
  const blocked = new Set<string>(restricted ? [...taskIndependentRoots, "activityLog", ...(trace ? ["notifications"] : [])] : []);
  const check = (key: PropertyKey) => { if (typeof key === "string" && blocked.has(key)) reject(`Unscoped dependency: ${key}`); };
  const immutableViews = new WeakMap<object, object>();
  const immutable = (value: unknown): unknown => {
    if (!value || typeof value !== "object") return value;
    if (immutableViews.has(value)) return immutableViews.get(value);
    const view = new Proxy(value, {
    get(target, key) { return immutable(Reflect.get(target, key)); },
    set() { return siblingReject("Sibling mutation"); },
    deleteProperty() { return siblingReject("Sibling deletion"); },
    defineProperty() { return siblingReject("Sibling definition"); },
    setPrototypeOf() { return siblingReject("Sibling prototype change"); },
    preventExtensions() { return siblingReject("Sibling extensibility change"); },
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      return descriptor && "value" in descriptor ? { ...descriptor, value: immutable(descriptor.value) } : descriptor;
    },
    });
    immutableViews.set(value, view);
    return view;
  };
  const taskViews = new WeakMap<object, DependencyState>();
  const taskView = (task: DependencyState): DependencyState => {
    if ((!trace && !projection) || task.id === (projection?.taskId || trace?.taskId)) return task;
    if (taskViews.has(task)) return taskViews.get(task)!;
    const read = (key: PropertyKey) => {
      if (typeof key !== "string" || ["__proto__", "constructor", "prototype"].includes(key)) return siblingReject("Unknown sibling field");
      if (projection && !(taskColdFields as readonly string[]).includes(key)) return missing(`Unread Task metadata: ${key}`);
      if (!trace) return;
      const fields = trace.reads[String(task.id)] ||= Object.create(null);
      if (!Object.hasOwn(fields, key)) fields[key] = Object.hasOwn(task, key) ? { present: true, value: task[key] } : { present: false };
    };
    const view = new Proxy(task, {
      get(target, key) { read(key); return immutable(Reflect.get(target, key)); },
      has(target, key) { read(key); return Reflect.has(target, key); },
      getOwnPropertyDescriptor(target, key) { read(key); const d = Reflect.getOwnPropertyDescriptor(target, key); return d && { ...d, value: immutable(d.value) }; },
      ownKeys() { return siblingReject("Sibling enumeration"); },
      set() { return siblingReject("Sibling mutation"); },
      deleteProperty() { return siblingReject("Sibling deletion"); },
      defineProperty() { return siblingReject("Sibling definition"); },
      setPrototypeOf() { return siblingReject("Sibling prototype change"); },
      preventExtensions() { return siblingReject("Sibling extensibility change"); },
    });
    taskViews.set(task, view); trackedTasks.set(view, { raw: task, trace, projection }); return view;
  };
  const taskArrays = new WeakMap<unknown[], unknown[]>();
  const taskArrayView = (tasks: unknown[]): unknown[] => {
    if (taskArrays.has(tasks)) return taskArrays.get(tasks)!;
    const item = (value: unknown) => dependencyObject(value) ? taskView(value) : value;
    const index = (key: PropertyKey) => typeof key === "string" && /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < 0xffffffff;
    // Array methods already traverse the requested rows; do not pre-map every Task on each read.
    const view = new Proxy(tasks, {
      get(target, key) { const value = Reflect.get(target, key); return index(key) ? item(value) : value; },
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        return descriptor && index(key) ? { ...descriptor, value: item(descriptor.value) } : descriptor;
      },
      set() { return siblingReject("Task array mutation"); },
      deleteProperty() { return siblingReject("Task array deletion"); },
      defineProperty() { return siblingReject("Task array definition"); },
      setPrototypeOf() { return siblingReject("Task array prototype change"); },
      preventExtensions() { return siblingReject("Task array extensibility change"); },
    });
    taskArrays.set(tasks, view); return view;
  };
  return new Proxy(raw, {
    get(target, key) {
      if (key === taskDependencyContextKey) return { raw: target, trace, validity, projection, restricted };
      check(key);
      return (trace || projection) && key === "tasks" && Array.isArray(target.tasks) ? taskArrayView(target.tasks) : Reflect.get(target, key);
    },
    has(target, key) { check(key); return Reflect.has(target, key); },
    getOwnPropertyDescriptor(target, key) {
      check(key); if (trace && key === "tasks") return reject("Untracked task descriptor");
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      return projection && key === "tasks" && descriptor && Array.isArray(target.tasks) ? { ...descriptor, value: taskArrayView(target.tasks) } : descriptor;
    },
    set(target, key, value) {
      check(key);
      if ((trace || projection) && key === "tasks") {
        if (!Array.isArray(value) || !Array.isArray(target.tasks)) return siblingReject("Task shape change");
        const tasks = value.map((task) => trackedTasks.get(task)?.raw || task);
        const original = target.tasks as DependencyState[];
        const creating = projection?.creating && !original.some(task => task.id === projection.taskId)
          && tasks.length === original.length + 1 && tasks.filter(task => task?.id === projection.taskId).length === 1;
        const unchanged = creating ? tasks.filter(task => task?.id !== projection!.taskId) : tasks;
        if (unchanged.length !== original.length || unchanged.some((task, index) => task?.id !== original[index]?.id
          || (task.id !== (projection?.taskId || trace?.taskId) && task !== original[index]))) return siblingReject("Sibling replacement/order change");
        return Reflect.set(target, key, tasks);
      }
      return Reflect.set(target, key, value);
    },
    deleteProperty(target, key) { check(key); if ((trace || projection) && key === "tasks") return siblingReject("Task deletion"); return Reflect.deleteProperty(target, key); },
    defineProperty(target, key, descriptor) { check(key); if ((trace || projection) && key === "tasks") return siblingReject("Task definition"); return Reflect.defineProperty(target, key, descriptor); },
    setPrototypeOf() { return siblingReject("Unscoped prototype change"); },
    preventExtensions(target) { return projection ? missing("Cold root extensibility change") : Reflect.preventExtensions(target); },
    ownKeys(target) { return restricted ? reject("Unscoped root enumeration") : Reflect.ownKeys(target); },
  });
}

// JSON cloning is a copy operation, not permission to read unscoped business roots.
export function cloneTaskDependencyContext<T>(value: T): { value: T } | null {
  if (value && typeof value === "object" && trackedTasks.has(value)) {
    const task = trackedTasks.get(value)!;
    if (task.projection) { task.projection.invalid = true; throw new TaskMetadataRequired("Untracked cold sibling clone"); }
    task.trace!.invalid = true; throw new TaskDependencyAccess("Untracked sibling clone");
  }
  const context = dependencyContext(value);
  if (!context) return null;
  const targetId = context.trace?.taskId || context.projection?.taskId;
  let copied: DependencyState;
  if (targetId && Array.isArray(context.raw.tasks)) {
    // Sibling views prohibit mutation, so copying their bodies only creates work.
    // Other roots and the mutable target retain the original deep-copy behavior.
    const { tasks, ...roots } = context.raw;
    copied = JSON.parse(JSON.stringify(roots));
    copied.tasks = (tasks as DependencyState[]).map(task => task.id === targetId ? JSON.parse(JSON.stringify(task)) : task);
  } else copied = JSON.parse(JSON.stringify(context.raw));
  return { value: guardTaskDependencies(copied, context.trace, context.validity, context.projection, context.restricted) as T };
}
export function guardTaskColdMetadata(state: DependencyState, taskId: string, creating = false): DependencyState {
  return guardTaskDependencies(state, undefined, { invalid: false }, { taskId, invalid: false, creating }, false);
}
export function unwrapTaskColdMetadata(state: DependencyState, required = false): DependencyState {
  const context = dependencyContext(state);
  if ((required && !context?.projection) || context?.projection?.invalid) throw new TaskMetadataRequired("Lost/invalid cold metadata guard");
  return context?.projection ? context.raw : state;
}
export function runTaskDependencyRules<T extends { state: DependencyState }>(state: DependencyState, run: (state: DependencyState) => T, taskId?: string): { result: T; isolated: boolean; reads?: TaskFieldReads } {
  const inherited = dependencyContext(state), projection = inherited?.projection, raw = projection ? inherited!.raw : state;
  const carry = (context: DependencyContext) => projection ? guardTaskDependencies(context.raw, undefined, { invalid: false }, projection, false) : context.raw;
  if (taskId && ordinaryDependencyTask((Array.isArray(state.tasks) ? state.tasks : []).find((task) => dependencyObject(task) && task.id === taskId))) {
    const trace: TaskReadTrace = { taskId, reads: Object.create(null) };
    try {
      const result = run(guardTaskDependencies(raw, trace, { invalid: false }, projection));
      const context = dependencyContext(result.state);
      if (!context || context.trace !== trace || trace.invalid || context.validity.invalid) throw new TaskDependencyAccess("Lost task read trace");
      return { result: { ...result, state: carry(context) }, isolated: true, reads: trace.reads };
    } catch (error) { if (!(error instanceof TaskDependencyAccess)) throw error; }
  }
  try {
    const result = run(guardTaskDependencies(raw, undefined, { invalid: false }, projection));
    const context = dependencyContext(result.state);
    if (!context || context.validity.invalid) throw new TaskDependencyAccess("Lost dependency context");
    return { result: { ...result, state: carry(context) }, isolated: true };
  } catch (error) {
    if (!(error instanceof TaskDependencyAccess)) throw error;
    return { result: run(state), isolated: false };
  }
}
export function appendTaskCommandNotification(state: DependencyState, entry: DependencyState): void {
  const raw = dependencyContext(state)?.raw || state;
  const rows = Array.isArray(raw.notifications) ? raw.notifications.filter(dependencyObject) : [];
  raw.notifications = [...rows.filter((row) => String(row.notificationType || "") === "acknowledgement"),
    ...[...rows.filter((row) => String(row.notificationType || "") === "event"), entry].slice(-3000)];
}
export function appendTaskCommandActivity(state: DependencyState, entry: DependencyState): void {
  const raw = dependencyContext(state)?.raw || state;
  const rows = Array.isArray(raw.activityLog) ? raw.activityLog.filter(dependencyObject) : [];
  raw.activityLog = [...rows, entry].slice(-5000);
}
export function taskRecurrenceActivityRows(state: DependencyState): DependencyState[] {
  const raw = dependencyContext(state)?.raw || state;
  return (Array.isArray(raw.activityLog) ? raw.activityLog.filter(dependencyObject) : [])
    .filter((entry) => String(entry.action || "") === "Tự tạo định kỳ");
}

function prepareTaskDependency(before: DependencyState, after: DependencyState, taskId: string) {
  const equal = (left: unknown, right: unknown) => left === right || JSON.stringify(left) === JSON.stringify(right);
  if (taskIndependentRoots.some((key) => Object.hasOwn(before, key) !== Object.hasOwn(after, key) || !equal(before[key], after[key]))) return null;
  const tasks = Array.isArray(before.tasks) ? before.tasks.filter(dependencyObject) : [];
  const task = tasks.find((item) => item.id === taskId);
  if (!ordinaryDependencyTask(task)) return null;
  const beforeLog = Array.isArray(before.activityLog) ? before.activityLog : null;
  const afterLog = Array.isArray(after.activityLog) ? after.activityLog : null;
  if (!beforeLog || !afterLog) return null;
  const oldIds = new Set<string>(), nextIds = new Set<string>();
  const generationReads: DependencyState[] = [], appended: DependencyState[] = [];
  for (const entry of beforeLog) {
    if (!dependencyObject(entry) || typeof entry.id !== "string" || !entry.id || oldIds.has(entry.id)) return null;
    oldIds.add(entry.id);
    if (String(entry.action || "") === "Tự tạo định kỳ") generationReads.push(entry);
  }
  for (const entry of afterLog) {
    if (!dependencyObject(entry) || typeof entry.id !== "string" || !entry.id || nextIds.has(entry.id)) return null;
    nextIds.add(entry.id);
    if (!oldIds.has(entry.id)) appended.push(entry);
  }
  if (appended.length !== 1 || !equal([...beforeLog, ...appended].slice(-5000), afterLog)) return null;
  const ignored = new Set<string>(["tasks", "activityLog", ...taskIndependentRoots]);
  const state = Object.fromEntries(Object.entries(before).filter(([key]) => !ignored.has(key)));
  return { tasks, envelope: { contract: "task-roots-v1", state, generationReads, activities: appended } };
}

function prepareTaskRecordDependency(before: DependencyState, after: DependencyState, taskId: string,
  prepared: NonNullable<ReturnType<typeof prepareTaskDependency>>, reads?: TaskFieldReads) {
  if (!reads) return null;
  const { envelope: base, tasks } = prepared;
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const fieldReads: TaskFieldReads = Object.assign(Object.create(null), JSON.parse(JSON.stringify(reads)));
  for (const row of tasks) {
    const rawId = row.id, id = String(rawId), dependencies = row.dependencyIds;
    if (dependencies !== undefined && (!Array.isArray(dependencies) || dependencies.some((value) => typeof value !== "string"))) return null;
    if (rawId === taskId) { if (Array.isArray(dependencies) && dependencies.length) return null; continue; }
    if (Array.isArray(dependencies) && dependencies.includes(taskId)) return null;
    (fieldReads[id] ||= Object.create(null)).dependencyIds = Object.hasOwn(row, "dependencyIds")
      ? { present: true, value: Array.isArray(dependencies) ? [...dependencies] : dependencies } : { present: false };
  }
  const old = before.notifications, next = after.notifications;
  if (!Array.isArray(old) || !Array.isArray(next) || [...old, ...next].some((row) => !dependencyObject(row) || typeof row.id !== "string" || !row.id
    || !["event", "acknowledgement"].includes(String(row.notificationType)))) return null;
  const oldIds = new Set(old.map((row) => row.id));
  if (oldIds.size !== old.length || new Set(next.map((row) => row.id)).size !== next.length) return null;
  const appended = next.filter((row) => !oldIds.has(row.id));
  if (appended.some((row) => row.notificationType !== "event" || row.targetType !== "task" || row.targetId !== taskId)) return null;
  const expected = appended.length ? [...old.filter((row) => row.notificationType === "acknowledgement"),
    ...[...old.filter((row) => row.notificationType === "event"), ...appended].slice(-3000)] : old;
  if (!equal(expected, next)) return null;
  const { notifications: _notifications, ...state } = base.state;
  return { ...base, contract: "task-record-reads-v1", state, fieldReads, notifications: appended };
}

export function taskDependencyEnvelopes(before: DependencyState, after: DependencyState, taskId: string, reads?: TaskFieldReads) {
  const prepared = prepareTaskDependency(before, after, taskId);
  return { envelope: prepared?.envelope || null, recordEnvelope: prepared ? prepareTaskRecordDependency(before, after, taskId, prepared, reads) : null };
}
export function taskDependencyEnvelope(before: DependencyState, after: DependencyState, taskId: string) {
  return prepareTaskDependency(before, after, taskId)?.envelope || null;
}
export function taskRecordDependencyEnvelope(before: DependencyState, after: DependencyState, taskId: string, reads?: TaskFieldReads) {
  if (!reads) return null;
  return taskDependencyEnvelopes(before, after, taskId, reads).recordEnvelope;
}
