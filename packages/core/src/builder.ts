/**
 * UDSL Core Builder
 *
 * Type-safe builder for creating operation pipelines.
 * Domain-agnostic - use with any plugin.
 */

import type { Conditional, Operation, Pipeline, PipelineStep, RefNow, RefTemp } from "./types";

// =============================================================================
// Symbol for identifying DSL values (used during build, not in output)
// =============================================================================

const DSL_MARKER: unique symbol = Symbol("udsl");

interface DslValue {
	[DSL_MARKER]: true;
	toJSON(): unknown;
}

function isDslValue(value: unknown): value is DslValue {
	return typeof value === "object" && value !== null && DSL_MARKER in value;
}

// =============================================================================
// Input Proxy - input.field → { $input: 'field' }
// =============================================================================

function createInputProxy<T extends object>(basePath = ""): T {
	const handler: ProxyHandler<T> = {
		get(_, prop) {
			if (prop === DSL_MARKER) return true;
			if (prop === "toJSON") {
				return () => ({ $input: basePath });
			}
			if (prop === "$input") return basePath;
			const path = basePath ? `${basePath}.${String(prop)}` : String(prop);
			return createInputProxy(path);
		},
	};
	return new Proxy(
		{
			[DSL_MARKER]: true,
			$input: basePath,
			toJSON() {
				return { $input: basePath };
			},
		} as T,
		handler,
	);
}

// =============================================================================
// Ref Proxy - ref("session").id → { $ref: 'session.id' }
// =============================================================================

interface RefProxy {
	[key: string]: RefProxy;
}

function createRefProxy(basePath: string): RefProxy {
	const handler: ProxyHandler<RefProxy> = {
		get(_, prop) {
			if (prop === DSL_MARKER) return true;
			if (prop === "toJSON") {
				return () => ({ $ref: basePath });
			}
			if (prop === "$ref") return basePath;
			const path = `${basePath}.${String(prop)}`;
			return createRefProxy(path);
		},
	};
	return new Proxy(
		{
			[DSL_MARKER]: true,
			$ref: basePath,
			toJSON() {
				return { $ref: basePath };
			},
		} as unknown as RefProxy,
		handler,
	);
}

// =============================================================================
// Special Values
// =============================================================================

interface OperatorValue extends DslValue {
	[key: string]: unknown;
}

/**
 * Reference a named result
 * ref("user").id → { $ref: "user.id" }
 */
export function ref(name: string): RefProxy {
	return createRefProxy(name);
}

/**
 * Current timestamp
 * now() → { $now: true }
 */
export function now(): RefNow & DslValue {
	return {
		[DSL_MARKER]: true,
		$now: true,
		toJSON() {
			return { $now: true };
		},
	};
}

/**
 * Generate temporary ID
 * temp() → { $temp: true }
 */
export function temp(): RefTemp & DslValue {
	return {
		[DSL_MARKER]: true,
		$temp: true,
		toJSON() {
			return { $temp: true };
		},
	};
}

/**
 * Increment operator
 * inc(1) → { $inc: 1 }
 */
export function inc(n: number): OperatorValue {
	return {
		[DSL_MARKER]: true,
		$inc: n,
		toJSON() {
			return { $inc: n };
		},
	};
}

/**
 * Decrement operator
 * dec(1) → { $dec: 1 }
 */
export function dec(n: number): OperatorValue {
	return {
		[DSL_MARKER]: true,
		$dec: n,
		toJSON() {
			return { $dec: n };
		},
	};
}

/**
 * Push to array
 * push("item") → { $push: "item" }
 */
export function push(...items: unknown[]): OperatorValue {
	const value = items.length === 1 ? items[0] : items;
	return {
		[DSL_MARKER]: true,
		$push: value,
		toJSON() {
			return { $push: value };
		},
	};
}

/**
 * Pull from array
 * pull("item") → { $pull: "item" }
 */
export function pull(...items: unknown[]): OperatorValue {
	const value = items.length === 1 ? items[0] : items;
	return {
		[DSL_MARKER]: true,
		$pull: value,
		toJSON() {
			return { $pull: value };
		},
	};
}

/**
 * Add to set
 * addToSet("item") → { $addToSet: "item" }
 */
export function addToSet(...items: unknown[]): OperatorValue {
	const value = items.length === 1 ? items[0] : items;
	return {
		[DSL_MARKER]: true,
		$addToSet: value,
		toJSON() {
			return { $addToSet: value };
		},
	};
}

/**
 * Default value if undefined
 * defaultTo("fallback") → { $default: "fallback" }
 */
export function defaultTo(value: unknown): OperatorValue {
	return {
		[DSL_MARKER]: true,
		$default: value,
		toJSON() {
			return { $default: value };
		},
	};
}

/**
 * Conditional value
 * when(cond, "yes", "no") → { $if: { cond, then, else } }
 */
export function when(cond: unknown, thenValue: unknown, elseValue?: unknown): OperatorValue {
	return {
		[DSL_MARKER]: true,
		$if: {
			cond: serialize(cond),
			then: serialize(thenValue),
			else: elseValue !== undefined ? serialize(elseValue) : undefined,
		},
		toJSON() {
			return {
				$if: {
					cond: serialize(cond),
					then: serialize(thenValue),
					else: elseValue !== undefined ? serialize(elseValue) : undefined,
				},
			};
		},
	};
}

// =============================================================================
// Operation Builder
// =============================================================================

interface OperationBuilder extends StepBuilder {
	/** Add $as (name this result) */
	as(name: string): OperationBuilder;
	/** Add $only (conditional execution - skip if falsy) */
	only(condition: unknown): OperationBuilder;
	/** Build the operation */
	build(): Operation;
}

/** Common interface for both Operation and Conditional builders */
export interface StepBuilder {
	/** Name this result for later $ref */
	as(name: string): StepBuilder;
	/** Build the step */
	build(): PipelineStep;
}

function createOperationBuilder(effect: string, args: Record<string, unknown>): OperationBuilder {
	let name: string | undefined;
	let condition: unknown | undefined;

	const builder: OperationBuilder = {
		as(n: string) {
			name = n;
			return builder;
		},
		only(c: unknown) {
			condition = c;
			return builder;
		},
		build(): Operation {
			const op: Operation = {
				$do: effect,
				$with: serialize(args) as Record<string, unknown>,
			};
			if (name) op.$as = name;
			if (condition !== undefined) op.$only = serialize(condition);
			return op;
		},
	};

	return builder;
}

/**
 * Create an operation
 * op("entity.create", { type: "User", name: input.name }).as("user")
 */
export function op(effect: string, args: Record<string, unknown> = {}): OperationBuilder {
	return createOperationBuilder(effect, args);
}

// =============================================================================
// Conditional Builder - branch().then().else()
// =============================================================================

/** Builder that needs .then() */
interface ConditionalThenBuilder {
	/** Execute if condition is truthy (supports nesting) */
	then(...steps: StepBuilder[]): ConditionalElseBuilder;
}

/** Builder that can optionally have .else() */
interface ConditionalElseBuilder extends StepBuilder {
	/** Execute if condition is falsy (supports nesting) */
	else(...steps: StepBuilder[]): ConditionalElseBuilder;
}

function createConditionalBuilder(condition: unknown): ConditionalThenBuilder {
	let thenSteps: StepBuilder[] = [];
	let elseSteps: StepBuilder[] | undefined;
	let name: string | undefined;

	const elseBuilder: ConditionalElseBuilder = {
		else(...steps: StepBuilder[]) {
			elseSteps = steps;
			return elseBuilder;
		},
		as(n: string) {
			name = n;
			return elseBuilder;
		},
		build(): Conditional {
			const cond: Conditional = {
				$when: serialize(condition),
				$then:
					thenSteps.length === 1
						? thenSteps[0]!.build()
						: thenSteps.map((step) => step.build()),
			};
			if (elseSteps) {
				cond.$else =
					elseSteps.length === 1
						? elseSteps[0]!.build()
						: elseSteps.map((step) => step.build());
			}
			if (name) cond.$as = name;
			return cond;
		},
	};

	return {
		then(...steps: StepBuilder[]) {
			thenSteps = steps;
			return elseBuilder;
		},
	};
}

/**
 * Create a conditional branch
 * branch(input.sessionId).then(op(...)).else(op(...)).as("session")
 */
export function branch(condition: unknown): ConditionalThenBuilder {
	return createConditionalBuilder(condition);
}

// =============================================================================
// Pipeline Builder
// =============================================================================

interface PipelineContext<TInput> {
	input: TInput;
}

/**
 * Serialize a value to JSON format
 */
function serialize(value: unknown): unknown {
	if (isDslValue(value)) {
		return value.toJSON();
	}
	if (Array.isArray(value)) {
		return value.map(serialize);
	}
	if (typeof value === "object" && value !== null) {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			result[k] = serialize(v);
		}
		return result;
	}
	return value;
}

/**
 * Create a DSL pipeline
 *
 * @example
 * ```typescript
 * const dsl = pipe(({ input }) => [
 *   op("entity.create", { type: "Session", title: input.title }).as("session"),
 *   branch(input.sessionId)
 *     .then(op("entity.update", { ... }))
 *     .else(op("entity.create", { ... }))
 *     .as("result"),
 * ]);
 * ```
 */
export function pipe<TInput extends object = Record<string, unknown>>(
	builder: (ctx: PipelineContext<TInput>) => StepBuilder[],
): Pipeline {
	const input = createInputProxy<TInput>();
	const steps = builder({ input });

	return {
		$pipe: steps.map((step) => step.build()),
	};
}

/**
 * Create a single operation DSL
 */
export function single<TInput extends object = Record<string, unknown>>(
	builder: (ctx: PipelineContext<TInput>) => OperationBuilder,
): Operation {
	const input = createInputProxy<TInput>();
	return builder({ input }).build();
}

// =============================================================================
// Exports
// =============================================================================

export { createInputProxy };
