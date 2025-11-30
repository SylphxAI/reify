/**
 * UDSL Executor
 *
 * Executes operation pipelines using registered plugins.
 */

import {
	type DSL,
	type EvalContext,
	type Operation,
	type Pipeline,
	type Plugin,
	isOperation,
	isPipeline,
	isRefInput,
	isRefNow,
	isRefResult,
	isRefTemp,
} from "./types";

// =============================================================================
// Plugin Registry
// =============================================================================

const plugins = new Map<string, Plugin>();

/**
 * Register a plugin
 *
 * @example
 * ```typescript
 * registerPlugin({
 *   namespace: "entity",
 *   effects: {
 *     create: (args, ctx) => ({ id: ctx.tempId?.() ?? "temp", ...args }),
 *     update: (args, ctx) => args,
 *     delete: (args, ctx) => ({ deleted: true }),
 *   }
 * });
 * ```
 */
export function registerPlugin(plugin: Plugin): void {
	plugins.set(plugin.namespace, plugin);
}

/**
 * Unregister a plugin
 */
export function unregisterPlugin(namespace: string): void {
	plugins.delete(namespace);
}

/**
 * Clear all plugins
 */
export function clearPlugins(): void {
	plugins.clear();
}

/**
 * Get registered plugin namespaces
 */
export function getPluginNamespaces(): string[] {
	return [...plugins.keys()];
}

// =============================================================================
// Value Resolution
// =============================================================================

let tempIdCounter = 0;

/** Reset temp ID counter (for testing) */
export function resetTempIdCounter(): void {
	tempIdCounter = 0;
}

/**
 * Get nested value from object using dot-notation path
 */
function getNestedValue(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;

	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}

	return current;
}

/**
 * Check if value is truthy (DSL semantics)
 */
function isTruthy(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (value === false) return false;
	if (value === 0) return false;
	if (value === "") return false;
	if (Array.isArray(value) && value.length === 0) return false;
	return true;
}

/**
 * Resolve a value, expanding any DSL references
 */
export function resolveValue(value: unknown, ctx: EvalContext): unknown {
	if (value === null || value === undefined) return value;

	// $input reference
	if (isRefInput(value)) {
		return getNestedValue(ctx.input, value.$input);
	}

	// $ref reference
	if (isRefResult(value)) {
		return getNestedValue(ctx.results, value.$ref);
	}

	// $now reference
	if (isRefNow(value)) {
		return ctx.now ?? new Date();
	}

	// $temp reference
	if (isRefTemp(value)) {
		return ctx.tempId?.() ?? `temp_${++tempIdCounter}`;
	}

	// Handle operators and objects
	if (typeof value === "object" && value !== null) {
		const obj = value as Record<string, unknown>;

		// Operators - preserve as markers
		if ("$inc" in obj) return { $inc: obj.$inc };
		if ("$dec" in obj) return { $dec: obj.$dec };
		if ("$push" in obj) return { $push: resolveValue(obj.$push, ctx) };
		if ("$pull" in obj) return { $pull: resolveValue(obj.$pull, ctx) };
		if ("$addToSet" in obj) return { $addToSet: resolveValue(obj.$addToSet, ctx) };
		if ("$default" in obj) return obj.$default;

		// $if conditional
		if ("$if" in obj) {
			const cond = obj.$if as { cond: unknown; then: unknown; else?: unknown };
			const condResult = resolveValue(cond.cond, ctx);
			if (isTruthy(condResult)) {
				return resolveValue(cond.then, ctx);
			}
			return cond.else !== undefined ? resolveValue(cond.else, ctx) : undefined;
		}

		// Arrays
		if (Array.isArray(value)) {
			return value.map((v) => resolveValue(v, ctx));
		}

		// Plain objects - recursively resolve
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj)) {
			result[k] = resolveValue(v, ctx);
		}
		return result;
	}

	return value;
}

// =============================================================================
// Operation Execution
// =============================================================================

/** Result of executing an operation */
export interface OperationResult {
	/** Operation name ($as) */
	name?: string;
	/** Effect that was executed */
	effect: string;
	/** Resolved arguments */
	args: Record<string, unknown>;
	/** Result from effect handler */
	result: unknown;
	/** Was skipped due to $when */
	skipped: boolean;
}

/**
 * Execute a single operation
 */
export async function executeOperation(
	operation: Operation,
	ctx: EvalContext,
): Promise<OperationResult> {
	const { $do: effect, $with: args = {}, $as: name, $when: condition } = operation;

	// Check condition
	if (condition !== undefined) {
		const condResult = resolveValue(condition, ctx);
		if (!isTruthy(condResult)) {
			return { name, effect, args: {}, result: undefined, skipped: true };
		}
	}

	// Resolve arguments
	const resolvedArgs = resolveValue(args, ctx) as Record<string, unknown>;

	// Find plugin and effect handler
	const [namespace, effectName] = effect.includes(".")
		? effect.split(".", 2)
		: ["core", effect];

	const plugin = plugins.get(namespace!);
	if (!plugin) {
		throw new EvaluationError(`Unknown plugin namespace: ${namespace}`);
	}

	const handler = plugin.effects[effectName!];
	if (!handler) {
		throw new EvaluationError(`Unknown effect: ${effect}`);
	}

	// Execute handler
	const result = await handler(resolvedArgs, ctx);

	return { name, effect, args: resolvedArgs, result, skipped: false };
}

// =============================================================================
// Pipeline Execution
// =============================================================================

/** Result of executing a pipeline */
export interface PipelineResult {
	/** Results from each operation */
	operations: OperationResult[];
	/** Final return value */
	result: Record<string, unknown>;
}

/**
 * Execute a pipeline of operations
 */
export async function executePipeline(
	pipeline: Pipeline,
	input: Record<string, unknown>,
	options: { now?: Date; tempId?: () => string } = {},
): Promise<PipelineResult> {
	const results: Record<string, unknown> = {};
	const operationResults: OperationResult[] = [];

	// Create context with resolve helper
	const createCtx = (): EvalContext => ({
		input,
		results,
		now: options.now,
		tempId: options.tempId,
		resolve: (v) => resolveValue(v, createCtx()),
	});

	for (const operation of pipeline.$pipe) {
		const ctx = createCtx();
		const opResult = await executeOperation(operation, ctx);
		operationResults.push(opResult);

		// Store result if named
		if (opResult.name && !opResult.skipped) {
			results[opResult.name] = opResult.result;
		}
	}

	// Resolve return value
	const returnValue = pipeline.$return
		? (resolveValue(pipeline.$return, createCtx()) as Record<string, unknown>)
		: results;

	return { operations: operationResults, result: returnValue };
}

/**
 * Execute a DSL (operation or pipeline)
 */
export async function execute(
	dsl: DSL,
	input: Record<string, unknown>,
	options: { now?: Date; tempId?: () => string } = {},
): Promise<PipelineResult> {
	if (isPipeline(dsl)) {
		return executePipeline(dsl, input, options);
	}

	if (isOperation(dsl)) {
		// Wrap single operation in pipeline
		return executePipeline({ $pipe: [dsl] }, input, options);
	}

	throw new EvaluationError("Invalid DSL: expected Operation or Pipeline");
}

// =============================================================================
// Errors
// =============================================================================

export class EvaluationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "EvaluationError";
	}
}
