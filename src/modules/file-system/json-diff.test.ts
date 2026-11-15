import { describe, expect, it } from "vitest";
import { isFsError, type FsError, type FsErrorCode } from "./errors.ts";
import {
	applyConflictChoices,
	diffJson,
	mergeJson3Way,
	type ConflictChoice,
} from "./json-diff.ts";

function expectFsErrorCode(fn: () => unknown, code: FsErrorCode): FsError {
	try {
		fn();
	} catch (error) {
		expect(isFsError(error)).toBe(true);
		if (isFsError(error)) {
			expect(error.code).toBe(code);
			return error;
		}
	}
	throw new Error(`Expected FsError("${code}") to be thrown`);
}

function selectBySku(item: unknown): string {
	return (item as { sku: string }).sku;
}

function getConflictId(byPointer: Map<string, string>, pointer: string): string {
	const id = byPointer.get(pointer);
	if (id === undefined) {
		throw new Error(`Missing conflict for pointer "${pointer}"`);
	}
	return id;
}

describe("json-diff: diffJson", () => {
	it("computes hasChanges, summary, segments, and readable pointers", () => {
		const base = {
			title: "Plan",
			removedProp: true,
			entries: [
				{ id: 10, menge: 1 },
				{ id: 42, menge: 5 },
			],
		};
		const target = {
			title: "Plan",
			addedProp: "new",
			entries: [
				{ id: 10, menge: 1 },
				{ id: 42, menge: 8 },
			],
		};

		const noDiff = diffJson(base, structuredClone(base));
		expect(noDiff).toEqual({
			hasChanges: false,
			summary: { total: 0, added: 0, removed: 0, changed: 0 },
			entries: [],
		});

		const res = diffJson(base, target, {
			arrayKeyBy: { entries: "id" },
		});
		expect(res.hasChanges).toBe(true);
		expect(res.summary).toEqual({ total: 3, added: 1, removed: 1, changed: 1 });

		const changedEntry = res.entries.find((e) => e.pointer === "entries[id=42].menge");
		expect(changedEntry).toEqual({
			path: ["entries", 42, "menge"],
			segments: [
				{ kind: "prop", key: "entries" },
				{ kind: "array-item", keyField: "id", keyValue: 42 },
				{ kind: "prop", key: "menge" },
			],
			pointer: "entries[id=42].menge",
			kind: "changed",
			before: 5,
			after: 8,
		});

		expect(res.entries.find((e) => e.pointer === "removedProp")?.kind).toBe("removed");
		expect(res.entries.find((e) => e.pointer === "addedProp")?.kind).toBe("added");
	});

	it("enforces maxDepth guard and circular-reference detection with INVALID_CONFIG", () => {
		expectFsErrorCode(() => diffJson({}, {}, { maxDepth: 0 }), "INVALID_CONFIG");
		expectFsErrorCode(() => diffJson({}, {}, { maxDepth: -2 }), "INVALID_CONFIG");
		expectFsErrorCode(() => diffJson({}, {}, { maxDepth: 1.5 }), "INVALID_CONFIG");

		const deep = { a: { b: { c: { d: 1 } } } };
		expect(() => diffJson(deep, { a: { b: { c: { d: 2 } } } }, { maxDepth: 3 })).not.toThrow();
		expectFsErrorCode(
			() => diffJson(deep, { a: { b: { c: { d: 2 } } } }, { maxDepth: 2 }),
			"INVALID_CONFIG",
		);

		const circular: Record<string, unknown> = { name: "loop" };
		circular.self = circular;

		expectFsErrorCode(() => diffJson(circular, { name: "loop" }), "INVALID_CONFIG");
		expectFsErrorCode(() => diffJson({ name: "loop" }, circular), "INVALID_CONFIG");
		expectFsErrorCode(() => mergeJson3Way(circular, {}, {}), "INVALID_CONFIG");
	});

	it("supports arrayKeyBy (property name, custom fn, nested paths) without index-shift cascades", () => {
		const base = {
			groups: [
				{
					code: "A",
					items: [
						{ sku: "X1", qty: 1 },
						{ sku: "X2", qty: 2 },
					],
				},
			],
		};
		const target = {
			groups: [
				{
					code: "A",
					items: [
						{ sku: "X0", qty: 9 }, // inserted at index 0
						{ sku: "X1", qty: 1 },
						// X2 deleted
					],
				},
			],
		};

		const res = diffJson(base, target, {
			arrayKeyBy: {
				groups: "code",
				"groups.items": (item) => (item as { sku: string }).sku,
			},
		});

		expect(res.summary).toEqual({ total: 2, added: 1, removed: 1, changed: 0 });
		expect(res.entries.map((e) => `${e.kind}:${e.pointer}`)).toEqual([
			"removed:groups[code=A].items[key=X2]",
			"added:groups[code=A].items[key=X0]",
		]);
	});

	it("safely falls back when a keyed array has duplicate or missing keys", () => {
		const dupBase = { items: [{ id: 1, v: "a" }] };
		const dupTarget = {
			items: [
				{ id: 1, v: "a" },
				{ id: 1, v: "b" },
			],
		};
		const dupDiff = diffJson(dupBase, dupTarget, { arrayKeyBy: { items: "id" } });
		expect(dupDiff.hasChanges).toBe(true);
		expect(dupDiff.entries).toEqual([
			{
				path: ["items"],
				segments: [{ kind: "prop", key: "items" }],
				pointer: "items",
				kind: "changed",
				before: dupBase.items,
				after: dupTarget.items,
			},
		]);

		const missingKeyTarget = { items: [{ v: "no-id" }] };
		const missingDiff = diffJson(dupBase, missingKeyTarget, { arrayKeyBy: { items: "id" } });
		expect(missingDiff.hasChanges).toBe(true);
		expect(missingDiff.entries[0]?.pointer).toBe("items");
		expect(missingDiff.entries[0]?.after).toEqual(missingKeyTarget.items);
	});

	it("handles unkeyedArrayMode 'atomic' vs 'set'", () => {
		const base = { tags: ["a", "b", "c"] };
		const target = { tags: ["b", "c", "d"] };

		const atomic = diffJson(base, target, { unkeyedArrayMode: "atomic" });
		expect(atomic.summary).toEqual({ total: 1, added: 0, removed: 0, changed: 1 });
		expect(atomic.entries[0]?.pointer).toBe("tags");

		const setMode = diffJson(base, target, { unkeyedArrayMode: "set" });
		expect(setMode.summary).toEqual({ total: 2, added: 1, removed: 1, changed: 0 });
		expect(setMode.entries).toEqual([
			{
				path: ["tags", 0],
				segments: [
					{ kind: "prop", key: "tags" },
					{ kind: "index", index: 0 },
				],
				pointer: "tags[0]",
				kind: "removed",
				before: "a",
			},
			{
				path: ["tags", 2],
				segments: [
					{ kind: "prop", key: "tags" },
					{ kind: "index", index: 2 },
				],
				pointer: "tags[2]",
				kind: "added",
				after: "d",
			},
		]);
	});
});

describe("json-diff: mergeJson3Way", () => {
	it("falls back to clean two-way merge when base is undefined", () => {
		const local = {
			onlyLocal: 1,
			shared: "same",
			conflictField: "local-v",
			tags: ["a", "b"],
			items: [{ id: 1, v: "L" }],
		};
		const remote = {
			onlyRemote: 2,
			shared: "same",
			conflictField: "remote-v",
			tags: ["b", "c"],
			items: [
				{ id: 1, v: "L" },
				{ id: 2, v: "R" },
			],
		};

		const res = mergeJson3Way<Record<string, unknown>>(undefined, local, remote, {
			arrayKeyBy: { items: "id" },
			unkeyedArrayMode: "set",
		});

		expect(res.mode).toBe("two-way");
		expect(res.hasConflicts).toBe(true);
		expect(res.conflicts).toHaveLength(1);
		expect(res.conflicts[0]).toMatchObject({
			pointer: "conflictField",
			conflictKind: "value-mismatch",
			localValue: "local-v",
			remoteValue: "remote-v",
		});
		expect(res.merged).toEqual({
			onlyLocal: 1,
			shared: "same",
			conflictField: "local-v",
			tags: ["a", "b", "c"],
			items: [
				{ id: 1, v: "L" },
				{ id: 2, v: "R" },
			],
			onlyRemote: 2,
		});
	});

	it("deterministically merges disjoint object edits, keyed array edits/additions, and set arrays", () => {
		const base = {
			meta: { author: "ada", rev: 1 },
			tags: ["alpha", "beta"],
			entries: [
				{ id: 1, qty: 10, note: "init" },
				{ id: 2, qty: 20, note: "keep" },
			],
		};
		const local = {
			meta: { author: "ada", rev: 2 },
			tags: ["beta", "local-tag"],
			entries: [
				{ id: 1, qty: 15, note: "init" },
				{ id: 2, qty: 20, note: "keep" },
				{ id: 3, qty: 30, note: "from-local" },
			],
		};
		const remote = {
			meta: { author: "grace", rev: 1 },
			tags: ["alpha", "beta", "remote-tag"],
			entries: [
				{ id: 1, qty: 10, note: "updated-by-remote" },
				{ id: 2, qty: 20, note: "keep" },
				{ id: 4, qty: 40, note: "from-remote" },
			],
		};

		const res = mergeJson3Way(base, local, remote, {
			arrayKeyBy: { entries: "id" },
			unkeyedArrayMode: "set",
		});

		expect(res.mode).toBe("three-way");
		expect(res.hasConflicts).toBe(false);
		expect(res.conflicts).toEqual([]);
		expect(res.merged).toEqual({
			meta: { author: "grace", rev: 2 },
			tags: ["beta", "local-tag", "remote-tag"],
			entries: [
				{ id: 1, qty: 15, note: "updated-by-remote" },
				{ id: 2, qty: 20, note: "keep" },
				{ id: 3, qty: 30, note: "from-local" },
				{ id: 4, qty: 40, note: "from-remote" },
			],
		});
	});

	it("reports value-mismatch, type-mismatch, delete-edit, and duplicate-array-key conflicts", () => {
		const base = {
			count: 1,
			shape: { nested: true } as unknown,
			propLocalDeleted: "base",
			propRemoteDeleted: "base",
			items: [
				{ id: 1, label: "one" },
				{ id: 2, label: "two" },
			],
			dupLocal: [{ id: 1 }],
			dupRemote: [{ id: 1 }],
		};
		const local = {
			count: 2,
			shape: "now-string",
			// propLocalDeleted removed
			propRemoteDeleted: "local-edited",
			items: [
				// id=1 removed
				{ id: 2, label: "two-local-edited" },
			],
			dupLocal: [{ id: 1 }, { id: 1 }],
			dupRemote: [{ id: 1 }, { id: 2 }],
		};
		const remote = {
			count: 3,
			shape: { nested: false },
			propLocalDeleted: "remote-edited",
			// propRemoteDeleted removed
			items: [
				{ id: 1, label: "one-remote-edited" },
				// id=2 removed
			],
			dupLocal: [{ id: 1 }, { id: 2 }],
			dupRemote: [{ id: 1 }, { id: 1 }],
		};

		const res = mergeJson3Way<Record<string, unknown>>(base, local, remote, {
			arrayKeyBy: {
				items: "id",
				dupLocal: "id",
				dupRemote: "id",
			},
		});

		expect(res.hasConflicts).toBe(true);
		expect(new Set(res.conflicts.map((c) => c.id)).size).toBe(res.conflicts.length);
		const byPointer = new Map(res.conflicts.map((c) => [c.pointer, c]));

		expect(byPointer.get("count")).toMatchObject({
			conflictKind: "value-mismatch",
			baseValue: 1,
			localValue: 2,
			remoteValue: 3,
		});
		expect(byPointer.get("shape")?.conflictKind).toBe("type-mismatch");
		expect(byPointer.get("propLocalDeleted")).toMatchObject({
			conflictKind: "delete-edit",
			baseValue: "base",
			remoteValue: "remote-edited",
		});
		expect(byPointer.get("propLocalDeleted")?.localValue).toBeUndefined();
		expect(byPointer.get("propRemoteDeleted")).toMatchObject({
			conflictKind: "delete-edit",
			baseValue: "base",
			localValue: "local-edited",
		});
		expect(byPointer.get("propRemoteDeleted")?.remoteValue).toBeUndefined();
		expect(byPointer.get("items[id=1]")?.conflictKind).toBe("delete-edit");
		expect(byPointer.get("items[id=2]")?.conflictKind).toBe("delete-edit");
		expect(byPointer.get("dupLocal")?.conflictKind).toBe("duplicate-array-key");
		expect(byPointer.get("dupRemote")?.conflictKind).toBe("duplicate-array-key");
	});
});

describe("json-diff: applyConflictChoices", () => {
	it("resolves local, remote, and custom choices across objects, atomic arrays, and keyed items without mutating merged", () => {
		const base = {
			nested: { a: 1, b: 2 },
			unkeyed: ["x"],
			items: [
				{ id: 10, name: "ten" },
				{ id: 20, name: "twenty" },
			],
		};
		const local = {
			nested: { a: 100, b: 2 },
			unkeyed: ["x", "local"],
			items: [
				// id=10 deleted in local
				{ id: 20, name: "twenty-local" },
			],
		};
		const remote = {
			nested: { a: 200, b: 2 },
			unkeyed: ["x", "remote"],
			items: [
				{ id: 10, name: "ten-remote" },
				// id=20 deleted in remote
			],
		};

		const mergeRes = mergeJson3Way<Record<string, unknown>>(base, local, remote, {
			arrayKeyBy: { items: "id" },
		});
		expect(mergeRes.conflicts).toHaveLength(4);

		const mergedSnapshot = structuredClone(mergeRes.merged);
		const byPointer = new Map(mergeRes.conflicts.map((c) => [c.pointer, c.id]));

		const choices: Record<string, ConflictChoice> = {
			[getConflictId(byPointer, "nested.a")]: { custom: 999 },
			[getConflictId(byPointer, "unkeyed")]: "remote",
			[getConflictId(byPointer, "items[id=10]")]: "local", // keep deletion
			[getConflictId(byPointer, "items[id=20]")]: "local", // restore/apply local edit
		};

		const resolved = applyConflictChoices(mergeRes, choices);

		expect(mergeRes.merged).toEqual(mergedSnapshot);
		expect(resolved).toEqual({
			nested: { a: 999, b: 2 },
			unkeyed: ["x", "remote"],
			items: [{ id: 20, name: "twenty-local" }],
		});

		// Verify restoring id=10 via remote and deleting id=20 via remote works too
		const resolvedOpposite = applyConflictChoices(mergeRes, {
			[getConflictId(byPointer, "nested.a")]: "local",
			[getConflictId(byPointer, "unkeyed")]: { custom: ["custom-arr"] },
			[getConflictId(byPointer, "items[id=10]")]: "remote",
			[getConflictId(byPointer, "items[id=20]")]: "remote",
		});
		expect(resolvedOpposite).toEqual({
			nested: { a: 100, b: 2 },
			unkeyed: ["custom-arr"],
			items: [{ id: 10, name: "ten-remote" }],
		});
	});

	it("supports function arrayKeyBy selectors (including cloned mergeResult), { custom: undefined } deletion, and root-level conflicts", () => {
		const base = {
			items: [
				{ sku: "SKU-1", qty: 1 },
				{ sku: "SKU-2", qty: 2 },
				{ sku: "SKU-3", qty: 3 },
			],
			removable: "keep",
		};
		const local = {
			items: [
				{ sku: "SKU-1", qty: 10 },
				// SKU-2 deleted locally
				{ sku: "SKU-3", qty: 30 },
			],
			removable: "local-edit",
		};
		const remote = {
			items: [
				{ sku: "SKU-1", qty: 20 },
				{ sku: "SKU-2", qty: 200 },
				// SKU-3 deleted remotely
			],
			removable: "remote-edit",
		};

		const mergeRes = mergeJson3Way<Record<string, unknown>>(base, local, remote, {
			arrayKeyBy: { items: selectBySku },
		});
		expect(mergeRes.conflicts).toHaveLength(4);

		const byPointer = new Map(mergeRes.conflicts.map((c) => [c.pointer, c.id]));

		// Resolve using WeakMap-stored selector
		const resolved = applyConflictChoices(mergeRes, {
			[getConflictId(byPointer, "items[key=SKU-1].qty")]: "remote",
			[getConflictId(byPointer, "items[key=SKU-2]")]: "local", // keep deletion
			[getConflictId(byPointer, "items[key=SKU-3]")]: "local", // restore/apply local edit
			[getConflictId(byPointer, "removable")]: { custom: undefined },
		});
		expect(resolved).toEqual({
			items: [
				{ sku: "SKU-1", qty: 20 },
				{ sku: "SKU-3", qty: 30 },
			],
		});
		expect(Object.hasOwn(resolved, "removable")).toBe(false);

		// Resolve on a cloned mergeResult (WeakMap miss) by passing options.arrayKeyBy
		const clonedMergeRes = structuredClone(mergeRes);
		const resolvedCloned = applyConflictChoices(
			clonedMergeRes,
			{
				[getConflictId(byPointer, "items[key=SKU-1].qty")]: { custom: 77 },
				[getConflictId(byPointer, "items[key=SKU-2]")]: "remote", // restore remote edit
				[getConflictId(byPointer, "items[key=SKU-3]")]: "remote", // keep remote deletion
				[getConflictId(byPointer, "removable")]: "local",
			},
			{ arrayKeyBy: { items: selectBySku } },
		);
		expect(resolvedCloned).toEqual({
			items: [
				{ sku: "SKU-1", qty: 77 },
				{ sku: "SKU-2", qty: 200 },
			],
			removable: "local-edit",
		});

		// Root-level conflict (segments: [])
		const rootMerge = mergeJson3Way<unknown>("base", "local-val", "remote-val");
		expect(rootMerge.conflicts).toHaveLength(1);
		expect(rootMerge.conflicts[0]?.segments).toEqual([]);
		const rootId = rootMerge.conflicts[0]?.id ?? "";
		expect(applyConflictChoices(rootMerge, { [rootId]: "remote" })).toBe("remote-val");
		expect(applyConflictChoices(rootMerge, { [rootId]: { custom: 42 } })).toBe(42);
	});

	it("throws FsError('VALIDATION_FAILED') on missing or invalid choices", () => {
		const mergeRes = mergeJson3Way({ a: 1 }, { a: 2 }, { a: 3 });
		expect(mergeRes.conflicts).toHaveLength(1);
		const conflictId = mergeRes.conflicts[0]?.id ?? "";

		expectFsErrorCode(() => applyConflictChoices(mergeRes, {}), "VALIDATION_FAILED");
		expectFsErrorCode(
			() =>
				applyConflictChoices(mergeRes, {
					[conflictId]: "invalid-choice" as ConflictChoice,
				}),
			"VALIDATION_FAILED",
		);
	});

	it("supports diffJson and mergeJson3Way on root-level arrays with arrayKeyBy '$' and ''", () => {
		const base = [
			{ id: 1, name: "alpha", count: 1 },
			{ id: 2, name: "beta", count: 2 },
		];
		const local = [
			{ id: 1, name: "alpha-local", count: 1 },
			{ id: 2, name: "beta", count: 2 },
			{ id: 3, name: "gamma", count: 3 },
		];
		const remote = [
			{ id: 1, name: "alpha", count: 10 },
			{ id: 2, name: "beta-remote", count: 2 },
		];

		for (const rootKey of ["$", ""] as const) {
			const diff = diffJson(base, local, { arrayKeyBy: { [rootKey]: "id" } });
			expect(diff.hasChanges).toBe(true);
			expect(diff.summary).toEqual({ total: 2, added: 1, removed: 0, changed: 1 });
			expect(diff.entries.some((e) => e.pointer === "[id=1].name" && e.kind === "changed")).toBe(true);
			expect(diff.entries.some((e) => e.pointer === "[id=3]" && e.kind === "added")).toBe(true);

			// Clean 3-way merge across non-conflicting fields and additions on root-level array
			const cleanMerge = mergeJson3Way(base, local, remote, {
				arrayKeyBy: { [rootKey]: "id" },
			});
			expect(cleanMerge.hasConflicts).toBe(false);
			expect(cleanMerge.merged).toEqual([
				{ id: 1, name: "alpha-local", count: 10 },
				{ id: 2, name: "beta-remote", count: 2 },
				{ id: 3, name: "gamma", count: 3 },
			]);

			// Conflicting edit on same root-level array item field + applyConflictChoices
			const remoteConflict = [
				{ id: 1, name: "alpha-remote", count: 10 },
				{ id: 2, name: "beta", count: 2 },
			];
			const conflictMerge = mergeJson3Way(base, local, remoteConflict, {
				arrayKeyBy: { [rootKey]: "id" },
			});
			expect(conflictMerge.hasConflicts).toBe(true);
			expect(conflictMerge.conflicts).toHaveLength(1);
			const conflict = conflictMerge.conflicts[0];
			expect(conflict).toBeDefined();
			if (!conflict) throw new Error("Expected conflict");
			expect(conflict.pointer).toBe("[id=1].name");

			const resolved = applyConflictChoices(conflictMerge, {
				[conflict.id]: "remote",
			});
			expect(resolved).toEqual([
				{ id: 1, name: "alpha-remote", count: 10 },
				{ id: 2, name: "beta", count: 2 },
				{ id: 3, name: "gamma", count: 3 },
			]);
		}
	});
});
