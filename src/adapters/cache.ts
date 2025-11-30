/**
 * Cache Adapter for UDSL
 *
 * Creates an entity plugin that executes against an in-memory cache.
 * Perfect for client-side optimistic updates.
 *
 * @example
 * ```typescript
 * import { createCachePlugin, registerPlugin, execute } from "@sylphx/udsl";
 *
 * const cache = new Map();
 * registerPlugin(createCachePlugin(cache));
 *
 * const dsl = pipe(({ input }) => [
 *   entity.create("User", { name: input.name }).as("user"),
 * ]);
 *
 * // Updates cache optimistically
 * await execute(dsl, { name: "John" });
 * ```
 */

import type { EvalContext, Plugin } from "../types";

/** Minimal cache interface */
export interface CacheLike {
	get(key: string): unknown;
	set(key: string, value: unknown): void;
	delete(key: string): boolean;
	has(key: string): boolean;
}

export interface CachePluginOptions {
	/**
	 * Generate cache key from type and id.
	 * Default: `${type}:${id}`
	 */
	cacheKey?: (type: string, id: string) => string;

	/**
	 * Generate temp ID for new entities.
	 * Default: uses ctx.tempId() or `temp_${Date.now()}`
	 */
	generateId?: () => string;
}

/**
 * Create an entity plugin that executes against a cache
 */
export function createCachePlugin(
	cache: CacheLike,
	options: CachePluginOptions = {},
): Plugin {
	const getCacheKey = options.cacheKey ?? ((type: string, id: string) => `${type}:${id}`);
	let tempCounter = 0;
	const generateId = options.generateId ?? (() => `temp_${++tempCounter}`);

	return {
		namespace: "entity",
		effects: {
			create: (args: Record<string, unknown>, ctx: EvalContext) => {
				const { type, ...data } = args as { type: string; [key: string]: unknown };
				const id = (data.id as string) ?? ctx.tempId?.() ?? generateId();
				const resolved = resolveData(data, ctx);
				const entity = { id, ...resolved };

				cache.set(getCacheKey(type, id), entity);
				return entity;
			},

			update: (args: Record<string, unknown>, ctx: EvalContext) => {
				const { type, id, ...data } = args as { type: string; id: string; [key: string]: unknown };
				const key = getCacheKey(type, id);
				const existing = cache.get(key) as Record<string, unknown> | undefined;
				const resolved = resolveData(data, ctx);

				// Apply operators
				const updated = applyOperators(existing ?? { id }, resolved);
				cache.set(key, updated);
				return updated;
			},

			delete: (args: Record<string, unknown>, _ctx: EvalContext) => {
				const { type, id } = args as { type: string; id: string };
				const key = getCacheKey(type, id);
				const existing = cache.get(key);
				cache.delete(key);
				return existing ?? { id };
			},

			upsert: (args: Record<string, unknown>, ctx: EvalContext) => {
				const { type, id, ...data } = args as { type: string; id?: string; [key: string]: unknown };
				const entityId = id ?? ctx.tempId?.() ?? generateId();
				const key = getCacheKey(type, entityId);
				const existing = cache.get(key) as Record<string, unknown> | undefined;
				const resolved = resolveData(data, ctx);

				if (existing) {
					const updated = applyOperators(existing, resolved);
					cache.set(key, updated);
					return updated;
				}

				const entity = { id: entityId, ...resolved };
				cache.set(key, entity);
				return entity;
			},
		},
	};
}

/** Resolve all values in data object */
function resolveData(data: Record<string, unknown>, ctx: EvalContext): Record<string, unknown> {
	const resolved: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		resolved[key] = ctx.resolve(value);
	}
	return resolved;
}

/** Apply UDSL operators to existing entity */
function applyOperators(
	existing: Record<string, unknown>,
	updates: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...existing };

	for (const [key, value] of Object.entries(updates)) {
		if (isOperator(value)) {
			result[key] = applyOperator(existing[key], value);
		} else {
			result[key] = value;
		}
	}

	return result;
}

function isOperator(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) return false;
	const keys = Object.keys(value);
	return keys.length === 1 && keys[0]!.startsWith("$");
}

function applyOperator(current: unknown, op: Record<string, unknown>): unknown {
	const entries = Object.entries(op);
	const [opName, opValue] = entries[0]!;

	switch (opName) {
		case "$inc":
			return ((current as number) ?? 0) + (opValue as number);

		case "$dec":
			return ((current as number) ?? 0) - (opValue as number);

		case "$push": {
			const arr = Array.isArray(current) ? [...current] : [];
			if (Array.isArray(opValue)) {
				arr.push(...opValue);
			} else {
				arr.push(opValue);
			}
			return arr;
		}

		case "$pull": {
			const arr = Array.isArray(current) ? [...current] : [];
			const items = Array.isArray(opValue) ? opValue : [opValue];
			return arr.filter((item) => !items.includes(item));
		}

		case "$addToSet": {
			const arr = Array.isArray(current) ? [...current] : [];
			const items = Array.isArray(opValue) ? opValue : [opValue];
			for (const item of items) {
				if (!arr.includes(item)) arr.push(item);
			}
			return arr;
		}

		case "$default":
			return current ?? opValue;

		default:
			return opValue;
	}
}

export default createCachePlugin;
