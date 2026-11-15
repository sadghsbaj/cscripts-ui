import { FsError } from "./errors.ts";

export type DiffPathSegment =
	| { kind: "prop"; key: string }
	| { kind: "index"; index: number }
	| { kind: "array-item"; keyField: string; keyValue: string | number };

export type DiffKind = "added" | "removed" | "changed";

export interface DiffEntry {
	path: (string | number)[];
	segments: DiffPathSegment[];
	pointer: string;
	kind: DiffKind;
	before?: unknown;
	after?: unknown;
}

export interface JsonDiffSummary {
	total: number;
	added: number;
	removed: number;
	changed: number;
}

export interface JsonDiffResult {
	hasChanges: boolean;
	summary: JsonDiffSummary;
	entries: DiffEntry[];
}

export type ArrayKeySelector = string | ((item: unknown) => string | number);
export type ArrayKeyByMap = Record<string, ArrayKeySelector>;
export type UnkeyedArrayMode = "atomic" | "set";

export interface JsonDiffOptions {
	maxDepth?: number;
	arrayKeyBy?: ArrayKeyByMap;
	unkeyedArrayMode?: UnkeyedArrayMode;
}

export type JsonConflictKind =
	| "value-mismatch"
	| "delete-edit"
	| "type-mismatch"
	| "duplicate-array-key";

export interface JsonFieldConflict {
	id: string;
	path: (string | number)[];
	segments: DiffPathSegment[];
	pointer: string;
	conflictKind: JsonConflictKind;
	baseValue?: unknown;
	localValue?: unknown;
	remoteValue?: unknown;
}

export type JsonMergeMode = "two-way" | "three-way";

export interface JsonMergeResult<T = unknown> {
	mode: JsonMergeMode;
	merged: T;
	conflicts: JsonFieldConflict[];
	hasConflicts: boolean;
}

export type JsonMergeOptions = JsonDiffOptions;

export type ConflictChoice = "local" | "remote" | { custom: unknown };

const DEFAULT_MAX_DEPTH = 64;
const MERGE_ARRAY_KEY_BY = new WeakMap<object, ArrayKeyByMap>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const proto = Object.getPrototypeOf(value) as object | null;
	return proto === Object.prototype || proto === null;
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
	return (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	);
}

function isPrimitiveArray(values: readonly unknown[]): values is (string | number | boolean | null)[] {
	return values.every((item) => isPrimitive(item));
}

function resolveMaxDepth(maxDepth?: number): number {
	if (maxDepth === undefined) {
		return DEFAULT_MAX_DEPTH;
	}
	if (typeof maxDepth !== "number" || !Number.isSafeInteger(maxDepth) || maxDepth < 1) {
		throw new FsError("INVALID_CONFIG", `maxDepth must be a positive integer, got ${String(maxDepth)}.`, {
			details: { maxDepth },
		});
	}
	return maxDepth;
}

function assertSafeValueTree(
	value: unknown,
	maxDepth: number,
	depth = 0,
	ancestors: Set<object> = new Set(),
): void {
	if (value === null || typeof value !== "object") {
		return;
	}
	if (depth > maxDepth) {
		throw new FsError("INVALID_CONFIG", `JSON value exceeds maxDepth (${maxDepth}).`, {
			details: { maxDepth, depth },
		});
	}
	if (ancestors.has(value)) {
		throw new FsError("INVALID_CONFIG", "Circular reference detected in JSON value.", {
			details: { depth },
		});
	}

	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			for (const item of value) {
				assertSafeValueTree(item, maxDepth, depth + 1, ancestors);
			}
			return;
		}
		if (isPlainObject(value)) {
			for (const child of Object.values(value)) {
				assertSafeValueTree(child, maxDepth, depth + 1, ancestors);
			}
		}
	} finally {
		ancestors.delete(value);
	}
}

function cloneValue<T>(value: T): T {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => cloneValue(item)) as T;
	}
	if (isPlainObject(value)) {
		const copy: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			copy[key] = cloneValue(entryValue);
		}
		return copy as T;
	}
	return structuredClone(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	if (a === null || b === null || typeof a !== typeof b) {
		return false;
	}
	if (typeof a !== "object") {
		return false;
	}
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
			return false;
		}
		for (const [i, itemA] of a.entries()) {
			if (!deepEqual(itemA, b[i])) {
				return false;
			}
		}
		return true;
	}
	if (!isPlainObject(a) || !isPlainObject(b)) {
		return false;
	}
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) {
		return false;
	}
	for (const key of keysA) {
		if (!Object.hasOwn(b, key) || !deepEqual(a[key], b[key])) {
			return false;
		}
	}
	return true;
}

function formatPointer(segments: readonly DiffPathSegment[]): string {
	let result = "";
	for (const seg of segments) {
		if (seg.kind === "prop") {
			result = result.length === 0 ? seg.key : `${result}.${seg.key}`;
		} else if (seg.kind === "index") {
			result += `[${seg.index}]`;
		} else {
			result += `[${seg.keyField}=${String(seg.keyValue)}]`;
		}
	}
	return result;
}

function getPropDotPath(segments: readonly DiffPathSegment[]): string {
	const parts: string[] = [];
	for (const seg of segments) {
		if (seg.kind === "prop") {
			parts.push(seg.key);
		}
	}
	return parts.join(".");
}

function resolveArrayKeySelector(
	segments: readonly DiffPathSegment[],
	arrayKeyBy?: Record<string, ArrayKeySelector>,
): ArrayKeySelector | undefined {
	if (!arrayKeyBy) {
		return undefined;
	}
	const pointer = formatPointer(segments);
	if (pointer.length > 0 && Object.hasOwn(arrayKeyBy, pointer)) {
		return arrayKeyBy[pointer];
	}
	const propPath = getPropDotPath(segments);
	if (propPath.length > 0 && Object.hasOwn(arrayKeyBy, propPath)) {
		return arrayKeyBy[propPath];
	}
	const lastProp = segments.findLast((seg) => seg.kind === "prop");
	if (lastProp && lastProp.kind === "prop" && Object.hasOwn(arrayKeyBy, lastProp.key)) {
		return arrayKeyBy[lastProp.key];
	}
	return undefined;
}

interface ExtractedKeyedArray {
	ok: true;
	keyField: string;
	order: (string | number)[];
	byKey: Map<string | number, unknown>;
}

interface ExtractedKeyedArrayError {
	ok: false;
	reason: "duplicate-key" | "missing-key";
	keyValue?: string | number;
}

function extractKeyedArray(
	items: readonly unknown[],
	selector: ArrayKeySelector,
): ExtractedKeyedArray | ExtractedKeyedArrayError {
	const keyField = typeof selector === "string" ? selector : "key";
	const order: (string | number)[] = [];
	const byKey = new Map<string | number, unknown>();

	for (const item of items) {
		let key: unknown;
		if (typeof selector === "string") {
			if (!isPlainObject(item) || !Object.hasOwn(item, selector)) {
				return { ok: false, reason: "missing-key" };
			}
			key = Object.getOwnPropertyDescriptor(item, selector)?.value;
		} else {
			key = selector(item);
		}

		if (
			(typeof key !== "string" && typeof key !== "number") ||
			(typeof key === "number" && !Number.isFinite(key))
		) {
			return { ok: false, reason: "missing-key" };
		}

		if (byKey.has(key)) {
			return { ok: false, reason: "duplicate-key", keyValue: key };
		}

		order.push(key);
		byKey.set(key, item);
	}

	return { ok: true, keyField, order, byKey };
}

function pushDiffEntry(
	entries: DiffEntry[],
	path: (string | number)[],
	segments: DiffPathSegment[],
	kind: DiffKind,
	before?: unknown,
	after?: unknown,
): void {
	const entry: DiffEntry = {
		path: [...path],
		segments: [...segments],
		pointer: formatPointer(segments),
		kind,
	};
	if (before !== undefined) {
		entry.before = before;
	}
	if (after !== undefined) {
		entry.after = after;
	}
	entries.push(entry);
}

function diffValues(
	base: unknown,
	target: unknown,
	path: (string | number)[],
	segments: DiffPathSegment[],
	options: {
		arrayKeyBy?: Record<string, ArrayKeySelector>;
		unkeyedArrayMode: UnkeyedArrayMode;
	},
	entries: DiffEntry[],
): void {
	if (deepEqual(base, target)) {
		return;
	}

	if (isPlainObject(base) && isPlainObject(target)) {
		const seen = new Set<string>();
		const allKeys = [...Object.keys(base), ...Object.keys(target)];
		for (const key of allKeys) {
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);

			const inBase = Object.hasOwn(base, key);
			const inTarget = Object.hasOwn(target, key);
			const nextPath = [...path, key];
			const nextSegments: DiffPathSegment[] = [...segments, { kind: "prop", key }];

			if (inBase && !inTarget) {
				pushDiffEntry(entries, nextPath, nextSegments, "removed", base[key], undefined);
			} else if (!inBase && inTarget) {
				pushDiffEntry(entries, nextPath, nextSegments, "added", undefined, target[key]);
			} else {
				diffValues(base[key], target[key], nextPath, nextSegments, options, entries);
			}
		}
		return;
	}

	if (Array.isArray(base) && Array.isArray(target)) {
		const selector = resolveArrayKeySelector(segments, options.arrayKeyBy);
		if (selector !== undefined) {
			const baseMap = extractKeyedArray(base, selector);
			const targetMap = extractKeyedArray(target, selector);
			if (baseMap.ok && targetMap.ok) {
				const seenKeys = new Set<string | number>();
				for (const key of [...baseMap.order, ...targetMap.order]) {
					if (seenKeys.has(key)) {
						continue;
					}
					seenKeys.add(key);

					const inBase = baseMap.byKey.has(key);
					const inTarget = targetMap.byKey.has(key);
					const nextPath = [...path, key];
					const nextSegments: DiffPathSegment[] = [
						...segments,
						{ kind: "array-item", keyField: baseMap.keyField, keyValue: key },
					];

					if (inBase && !inTarget) {
						pushDiffEntry(
							entries,
							nextPath,
							nextSegments,
							"removed",
							baseMap.byKey.get(key),
							undefined,
						);
					} else if (!inBase && inTarget) {
						pushDiffEntry(
							entries,
							nextPath,
							nextSegments,
							"added",
							undefined,
							targetMap.byKey.get(key),
						);
					} else {
						diffValues(
							baseMap.byKey.get(key),
							targetMap.byKey.get(key),
							nextPath,
							nextSegments,
							options,
							entries,
						);
					}
				}
				return;
			}
		}

		if (
			options.unkeyedArrayMode === "set" &&
			isPrimitiveArray(base) &&
			isPrimitiveArray(target)
		) {
			const baseSet = new Set(base);
			const targetSet = new Set(target);

			for (const [i, baseItem] of base.entries()) {
				if (!targetSet.has(baseItem)) {
					pushDiffEntry(
						entries,
						[...path, i],
						[...segments, { kind: "index", index: i }],
						"removed",
						baseItem,
						undefined,
					);
				}
			}
			for (const [i, targetItem] of target.entries()) {
				if (!baseSet.has(targetItem)) {
					pushDiffEntry(
						entries,
						[...path, i],
						[...segments, { kind: "index", index: i }],
						"added",
						undefined,
						targetItem,
					);
				}
			}
			return;
		}

		pushDiffEntry(entries, path, segments, "changed", base, target);
		return;
	}

	pushDiffEntry(entries, path, segments, "changed", base, target);
}

export function diffJson(
	base: unknown,
	target: unknown,
	options?: JsonDiffOptions,
): JsonDiffResult {
	const maxDepth = resolveMaxDepth(options?.maxDepth);
	assertSafeValueTree(base, maxDepth);
	assertSafeValueTree(target, maxDepth);

	const entries: DiffEntry[] = [];
	diffValues(
		base,
		target,
		[],
		[],
		{
			arrayKeyBy: options?.arrayKeyBy,
			unkeyedArrayMode: options?.unkeyedArrayMode ?? "atomic",
		},
		entries,
	);

	let added = 0;
	let removed = 0;
	let changed = 0;
	for (const entry of entries) {
		if (entry.kind === "added") {
			added += 1;
		} else if (entry.kind === "removed") {
			removed += 1;
		} else {
			changed += 1;
		}
	}

	return {
		hasChanges: entries.length > 0,
		summary: {
			total: entries.length,
			added,
			removed,
			changed,
		},
		entries,
	};
}

interface MergeContext {
	arrayKeyBy?: Record<string, ArrayKeySelector>;
	unkeyedArrayMode: UnkeyedArrayMode;
	conflicts: JsonFieldConflict[];
	nextId: number;
}

function pushConflict(
	ctx: MergeContext,
	path: (string | number)[],
	segments: DiffPathSegment[],
	conflictKind: JsonConflictKind,
	baseValue: unknown,
	localValue: unknown,
	remoteValue: unknown,
): void {
	const id = `conflict-${ctx.nextId}`;
	ctx.nextId += 1;
	const conflict: JsonFieldConflict = {
		id,
		path: [...path],
		segments: [...segments],
		pointer: formatPointer(segments),
		conflictKind,
	};
	if (baseValue !== undefined) {
		conflict.baseValue = cloneValue(baseValue);
	}
	if (localValue !== undefined) {
		conflict.localValue = cloneValue(localValue);
	}
	if (remoteValue !== undefined) {
		conflict.remoteValue = cloneValue(remoteValue);
	}
	ctx.conflicts.push(conflict);
}

function mergeSetArraysTwoWay(
	local: readonly (string | number | boolean | null)[],
	remote: readonly (string | number | boolean | null)[],
): (string | number | boolean | null)[] {
	const seen = new Set<string | number | boolean | null>();
	const result: (string | number | boolean | null)[] = [];
	for (const item of [...local, ...remote]) {
		if (seen.has(item)) {
			continue;
		}
		seen.add(item);
		result.push(item);
	}
	return result;
}

function mergeSetArraysThreeWay(
	base: readonly (string | number | boolean | null)[],
	local: readonly (string | number | boolean | null)[],
	remote: readonly (string | number | boolean | null)[],
): (string | number | boolean | null)[] {
	const baseSet = new Set(base);
	const localSet = new Set(local);
	const remoteSet = new Set(remote);

	const result: (string | number | boolean | null)[] = [];
	const seen = new Set<string | number | boolean | null>();

	for (const item of base) {
		if (!localSet.has(item) || !remoteSet.has(item) || seen.has(item)) {
			continue;
		}
		seen.add(item);
		result.push(item);
	}
	for (const item of local) {
		if (baseSet.has(item) || seen.has(item)) {
			continue;
		}
		seen.add(item);
		result.push(item);
	}
	for (const item of remote) {
		if (baseSet.has(item) || seen.has(item)) {
			continue;
		}
		seen.add(item);
		result.push(item);
	}

	return result;
}

function sameValueShape(a: unknown, b: unknown): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		return true;
	}
	if (isPlainObject(a) && isPlainObject(b)) {
		return true;
	}
	return isPrimitive(a) && isPrimitive(b);
}

function mergeTwoWayNode(
	local: unknown,
	remote: unknown,
	path: (string | number)[],
	segments: DiffPathSegment[],
	ctx: MergeContext,
): unknown {
	if (deepEqual(local, remote)) {
		return cloneValue(local);
	}

	if (isPlainObject(local) && isPlainObject(remote)) {
		const merged: Record<string, unknown> = {};
		const seen = new Set<string>();
		for (const key of [...Object.keys(local), ...Object.keys(remote)]) {
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);

			const inLocal = Object.hasOwn(local, key);
			const inRemote = Object.hasOwn(remote, key);
			const nextPath = [...path, key];
			const nextSegments: DiffPathSegment[] = [...segments, { kind: "prop", key }];

			if (inLocal && !inRemote) {
				merged[key] = cloneValue(local[key]);
			} else if (!inLocal && inRemote) {
				merged[key] = cloneValue(remote[key]);
			} else {
				merged[key] = mergeTwoWayNode(local[key], remote[key], nextPath, nextSegments, ctx);
			}
		}
		return merged;
	}

	if (Array.isArray(local) && Array.isArray(remote)) {
		const selector = resolveArrayKeySelector(segments, ctx.arrayKeyBy);
		if (selector !== undefined) {
			const localMap = extractKeyedArray(local, selector);
			const remoteMap = extractKeyedArray(remote, selector);
			if (
				(!localMap.ok && localMap.reason === "duplicate-key") ||
				(!remoteMap.ok && remoteMap.reason === "duplicate-key")
			) {
				pushConflict(ctx, path, segments, "duplicate-array-key", undefined, local, remote);
				return cloneValue(local);
			}
			if (localMap.ok && remoteMap.ok) {
				const merged: unknown[] = [];
				const seen = new Set<string | number>();
				for (const key of [...localMap.order, ...remoteMap.order]) {
					if (seen.has(key)) {
						continue;
					}
					seen.add(key);
					const inLocal = localMap.byKey.has(key);
					const inRemote = remoteMap.byKey.has(key);
					const nextPath = [...path, key];
					const nextSegments: DiffPathSegment[] = [
						...segments,
						{ kind: "array-item", keyField: localMap.keyField, keyValue: key },
					];

					if (inLocal && !inRemote) {
						merged.push(cloneValue(localMap.byKey.get(key)));
					} else if (!inLocal && inRemote) {
						merged.push(cloneValue(remoteMap.byKey.get(key)));
					} else {
						merged.push(
							mergeTwoWayNode(
								localMap.byKey.get(key),
								remoteMap.byKey.get(key),
								nextPath,
								nextSegments,
								ctx,
							),
						);
					}
				}
				return merged;
			}
		}

		if (ctx.unkeyedArrayMode === "set" && isPrimitiveArray(local) && isPrimitiveArray(remote)) {
			return mergeSetArraysTwoWay(local, remote);
		}

		pushConflict(ctx, path, segments, "value-mismatch", undefined, local, remote);
		return cloneValue(local);
	}

	const conflictKind: JsonConflictKind = sameValueShape(local, remote)
		? "value-mismatch"
		: "type-mismatch";
	pushConflict(ctx, path, segments, conflictKind, undefined, local, remote);
	return cloneValue(local);
}

function mergeThreeWayNode(
	base: unknown,
	local: unknown,
	remote: unknown,
	path: (string | number)[],
	segments: DiffPathSegment[],
	ctx: MergeContext,
): unknown {
	if (deepEqual(local, remote)) {
		return cloneValue(local);
	}
	if (deepEqual(base, local)) {
		return cloneValue(remote);
	}
	if (deepEqual(base, remote)) {
		return cloneValue(local);
	}

	if (isPlainObject(base) && isPlainObject(local) && isPlainObject(remote)) {
		const merged: Record<string, unknown> = {};
		const seen = new Set<string>();
		for (const key of [...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]) {
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);

			const inBase = Object.hasOwn(base, key);
			const inLocal = Object.hasOwn(local, key);
			const inRemote = Object.hasOwn(remote, key);
			const nextPath = [...path, key];
			const nextSegments: DiffPathSegment[] = [...segments, { kind: "prop", key }];

			if (!inBase) {
				if (inLocal && !inRemote) {
					merged[key] = cloneValue(local[key]);
				} else if (!inLocal && inRemote) {
					merged[key] = cloneValue(remote[key]);
				} else {
					merged[key] = mergeTwoWayNode(local[key], remote[key], nextPath, nextSegments, ctx);
				}
				continue;
			}

			if (!inLocal && !inRemote) {
				continue;
			}
			if (!inLocal && inRemote) {
				if (!deepEqual(base[key], remote[key])) {
					pushConflict(
						ctx,
						nextPath,
						nextSegments,
						"delete-edit",
						base[key],
						undefined,
						remote[key],
					);
					merged[key] = cloneValue(remote[key]);
				}
				continue;
			}
			if (inLocal && !inRemote) {
				if (!deepEqual(base[key], local[key])) {
					pushConflict(
						ctx,
						nextPath,
						nextSegments,
						"delete-edit",
						base[key],
						local[key],
						undefined,
					);
					merged[key] = cloneValue(local[key]);
				}
				continue;
			}

			merged[key] = mergeThreeWayNode(
				base[key],
				local[key],
				remote[key],
				nextPath,
				nextSegments,
				ctx,
			);
		}
		return merged;
	}

	if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
		const selector = resolveArrayKeySelector(segments, ctx.arrayKeyBy);
		if (selector !== undefined) {
			const baseMap = extractKeyedArray(base, selector);
			const localMap = extractKeyedArray(local, selector);
			const remoteMap = extractKeyedArray(remote, selector);

			if (
				(!baseMap.ok && baseMap.reason === "duplicate-key") ||
				(!localMap.ok && localMap.reason === "duplicate-key") ||
				(!remoteMap.ok && remoteMap.reason === "duplicate-key")
			) {
				pushConflict(ctx, path, segments, "duplicate-array-key", base, local, remote);
				return cloneValue(local);
			}

			if (baseMap.ok && localMap.ok && remoteMap.ok) {
				const merged: unknown[] = [];
				const seen = new Set<string | number>();
				for (const key of [...baseMap.order, ...localMap.order, ...remoteMap.order]) {
					if (seen.has(key)) {
						continue;
					}
					seen.add(key);

					const inBase = baseMap.byKey.has(key);
					const inLocal = localMap.byKey.has(key);
					const inRemote = remoteMap.byKey.has(key);
					const nextPath = [...path, key];
					const nextSegments: DiffPathSegment[] = [
						...segments,
						{ kind: "array-item", keyField: baseMap.keyField, keyValue: key },
					];

					if (!inBase) {
						if (inLocal && !inRemote) {
							merged.push(cloneValue(localMap.byKey.get(key)));
						} else if (!inLocal && inRemote) {
							merged.push(cloneValue(remoteMap.byKey.get(key)));
						} else {
							merged.push(
								mergeTwoWayNode(
									localMap.byKey.get(key),
									remoteMap.byKey.get(key),
									nextPath,
									nextSegments,
									ctx,
								),
							);
						}
						continue;
					}

					if (!inLocal && !inRemote) {
						continue;
					}
					if (!inLocal && inRemote) {
						if (!deepEqual(baseMap.byKey.get(key), remoteMap.byKey.get(key))) {
							pushConflict(
								ctx,
								nextPath,
								nextSegments,
								"delete-edit",
								baseMap.byKey.get(key),
								undefined,
								remoteMap.byKey.get(key),
							);
							merged.push(cloneValue(remoteMap.byKey.get(key)));
						}
						continue;
					}
					if (inLocal && !inRemote) {
						if (!deepEqual(baseMap.byKey.get(key), localMap.byKey.get(key))) {
							pushConflict(
								ctx,
								nextPath,
								nextSegments,
								"delete-edit",
								baseMap.byKey.get(key),
								localMap.byKey.get(key),
								undefined,
							);
							merged.push(cloneValue(localMap.byKey.get(key)));
						}
						continue;
					}

					merged.push(
						mergeThreeWayNode(
							baseMap.byKey.get(key),
							localMap.byKey.get(key),
							remoteMap.byKey.get(key),
							nextPath,
							nextSegments,
							ctx,
						),
					);
				}
				return merged;
			}
		}

		if (
			ctx.unkeyedArrayMode === "set" &&
			isPrimitiveArray(base) &&
			isPrimitiveArray(local) &&
			isPrimitiveArray(remote)
		) {
			return mergeSetArraysThreeWay(base, local, remote);
		}

		pushConflict(ctx, path, segments, "value-mismatch", base, local, remote);
		return cloneValue(local);
	}

	const isTypeMismatch =
		!sameValueShape(base, local) || !sameValueShape(base, remote) || !sameValueShape(local, remote);
	pushConflict(
		ctx,
		path,
		segments,
		isTypeMismatch ? "type-mismatch" : "value-mismatch",
		base,
		local,
		remote,
	);
	return cloneValue(local);
}

export function mergeJson3Way<T = unknown>(
	base: T | undefined,
	local: T,
	remote: T,
	options?: JsonMergeOptions,
): JsonMergeResult<T> {
	const maxDepth = resolveMaxDepth(options?.maxDepth);
	if (base !== undefined) {
		assertSafeValueTree(base, maxDepth);
	}
	assertSafeValueTree(local, maxDepth);
	assertSafeValueTree(remote, maxDepth);

	const ctx: MergeContext = {
		arrayKeyBy: options?.arrayKeyBy,
		unkeyedArrayMode: options?.unkeyedArrayMode ?? "atomic",
		conflicts: [],
		nextId: 1,
	};

	const mode: JsonMergeMode = base === undefined ? "two-way" : "three-way";
	const merged = (
		mode === "two-way"
			? mergeTwoWayNode(local, remote, [], [], ctx)
			: mergeThreeWayNode(base, local, remote, [], [], ctx)
	) as T;

	const result: JsonMergeResult<T> = {
		mode,
		merged,
		conflicts: ctx.conflicts,
		hasConflicts: ctx.conflicts.length > 0,
	};
	if (options?.arrayKeyBy) {
		MERGE_ARRAY_KEY_BY.set(result, options.arrayKeyBy);
	}
	return result;
}

function findKeyedArrayItemIndex(
	items: readonly unknown[],
	arraySegments: readonly DiffPathSegment[],
	seg: Extract<DiffPathSegment, { kind: "array-item" }>,
	arrayKeyBy?: ArrayKeyByMap,
): number {
	const selector = resolveArrayKeySelector(arraySegments, arrayKeyBy);
	if (typeof selector === "function") {
		return items.findIndex((item) => {
			try {
				return selector(item) === seg.keyValue;
			} catch {
				return false;
			}
		});
	}
	const keyField = typeof selector === "string" ? selector : seg.keyField;
	return items.findIndex(
		(item) =>
			isPlainObject(item) &&
			Object.hasOwn(item, keyField) &&
			Object.getOwnPropertyDescriptor(item, keyField)?.value === seg.keyValue,
	);
}

function applySegmentPatch(
	root: unknown,
	segments: readonly DiffPathSegment[],
	isDelete: boolean,
	resolvedValue: unknown,
	arrayKeyBy?: ArrayKeyByMap,
): unknown {
	if (segments.length === 0) {
		return isDelete ? undefined : resolvedValue;
	}

	let cursor: unknown = root;
	for (let i = 0; i < segments.length - 1; i += 1) {
		const seg = segments[i];
		if (!seg) {
			continue;
		}
		if (seg.kind === "prop") {
			if (!isPlainObject(cursor)) {
				return root;
			}
			cursor = cursor[seg.key];
		} else if (seg.kind === "index") {
			if (!Array.isArray(cursor)) {
				return root;
			}
			cursor = cursor[seg.index];
		} else {
			if (!Array.isArray(cursor)) {
				return root;
			}
			const itemIndex = findKeyedArrayItemIndex(
				cursor,
				segments.slice(0, i),
				seg,
				arrayKeyBy,
			);
			cursor = itemIndex === -1 ? undefined : cursor[itemIndex];
		}
	}

	const lastSeg = segments.at(-1);
	if (!lastSeg) {
		return root;
	}

	if (lastSeg.kind === "prop" && isPlainObject(cursor)) {
		if (isDelete) {
			delete cursor[lastSeg.key];
		} else {
			cursor[lastSeg.key] = resolvedValue;
		}
	} else if (lastSeg.kind === "index" && Array.isArray(cursor)) {
		if (isDelete) {
			cursor.splice(lastSeg.index, 1);
		} else {
			cursor[lastSeg.index] = resolvedValue;
		}
	} else if (lastSeg.kind === "array-item" && Array.isArray(cursor)) {
		const index = findKeyedArrayItemIndex(
			cursor,
			segments.slice(0, -1),
			lastSeg,
			arrayKeyBy,
		);
		if (isDelete) {
			if (index !== -1) {
				cursor.splice(index, 1);
			}
		} else if (index !== -1) {
			cursor[index] = resolvedValue;
		} else {
			cursor.push(resolvedValue);
		}
	}

	return root;
}

export function applyConflictChoices<T = unknown>(
	mergeResult: JsonMergeResult<T>,
	choices: Record<string, ConflictChoice>,
	options?: { arrayKeyBy?: ArrayKeyByMap },
): T {
	let result = cloneValue(mergeResult.merged);
	const arrayKeyBy = options?.arrayKeyBy ?? MERGE_ARRAY_KEY_BY.get(mergeResult);

	for (const conflict of mergeResult.conflicts) {
		if (!Object.hasOwn(choices, conflict.id)) {
			throw new FsError(
				"VALIDATION_FAILED",
				`Missing conflict resolution choice for "${conflict.id}" (${conflict.pointer}).`,
				{ details: { conflictId: conflict.id, pointer: conflict.pointer } },
			);
		}

		const choice = choices[conflict.id];
		let isDelete = false;
		let resolvedValue: unknown;

		if (choice === "local") {
			if (conflict.localValue === undefined) {
				isDelete = true;
			} else {
				resolvedValue = cloneValue(conflict.localValue);
			}
		} else if (choice === "remote") {
			if (conflict.remoteValue === undefined) {
				isDelete = true;
			} else {
				resolvedValue = cloneValue(conflict.remoteValue);
			}
		} else if (typeof choice === "object" && choice !== null && "custom" in choice) {
			if (choice.custom === undefined) {
				isDelete = true;
			} else {
				resolvedValue = cloneValue(choice.custom);
			}
		} else {
			throw new FsError(
				"VALIDATION_FAILED",
				`Invalid conflict resolution choice for "${conflict.id}".`,
				{ details: { conflictId: conflict.id, choice } },
			);
		}

		result = applySegmentPatch(
			result,
			conflict.segments,
			isDelete,
			resolvedValue,
			arrayKeyBy,
		) as T;
	}

	return result;
}
