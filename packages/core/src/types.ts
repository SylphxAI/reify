/**
 * Reify Core Type Definitions
 *
 * Domain-agnostic DSL primitives.
 * All types are plain objects - serialize however you want.
 */

// =============================================================================
// Value References - How to get values
// =============================================================================

/** Reference to input data: { $input: "path.to.field" } */
export interface RefInput {
	$input: string
}

/** Reference to a named result: { $ref: "resultName.field" } */
export interface RefResult {
	$ref: string
}

/** Current timestamp: { $now: true } */
export interface RefNow {
	$now: true
}

/** Generate temporary ID: { $temp: true } */
export interface RefTemp {
	$temp: true
}

/** Any value reference */
export type ValueRef = RefInput | RefResult | RefNow | RefTemp

// =============================================================================
// Operators - Transform values inline
// =============================================================================

/** Increment number: { $inc: 1 } */
export interface OpInc {
	$inc: number
}

/** Decrement number: { $dec: 1 } */
export interface OpDec {
	$dec: number
}

/** Push to array: { $push: value } */
export interface OpPush {
	$push: unknown
}

/** Pull from array: { $pull: value } */
export interface OpPull {
	$pull: unknown
}

/** Add to set: { $addToSet: value } */
export interface OpAddToSet {
	$addToSet: unknown
}

/** Default value if undefined: { $default: value } */
export interface OpDefault {
	$default: unknown
}

/** Conditional value: { $if: { cond, then, else? } } */
export interface OpIf {
	$if: {
		cond: unknown
		then: unknown
		else?: unknown
	}
}

/** Any operator */
export type Operator = OpInc | OpDec | OpPush | OpPull | OpAddToSet | OpDefault | OpIf

// =============================================================================
// Core Primitives - Operation and Pipeline
// =============================================================================

/**
 * Operation - Single unit of work
 *
 * @example
 * ```json
 * {
 *   "$do": "entity.create",
 *   "$with": { "type": "User", "name": { "$input": "name" } },
 *   "$as": "user",
 *   "$only": { "$input": "shouldCreate" }
 * }
 * ```
 */
export interface Operation {
	/** Effect to execute (namespaced, e.g., "entity.create", "http.post") */
	$do: string
	/** Arguments for the effect */
	$with?: Record<string, unknown>
	/** Name this result for later $ref */
	$as?: string
	/** Only execute if condition is truthy (skip otherwise) */
	$only?: unknown
}

/**
 * Conditional - Branch execution based on condition
 *
 * @example
 * ```json
 * {
 *   "$when": { "$input": "sessionId" },
 *   "$then": { "$do": "entity.update", "$with": {...} },
 *   "$else": { "$do": "entity.create", "$with": {...} },
 *   "$as": "session"
 * }
 * ```
 */
export interface Conditional {
	/** Condition to evaluate */
	$when: unknown
	/** Execute if condition is truthy (single step or array, supports nesting) */
	$then: PipelineStep | PipelineStep[]
	/** Execute if condition is falsy (single step or array, supports nesting) */
	$else?: PipelineStep | PipelineStep[]
	/** Name the result for later $ref */
	$as?: string
}

/** Any pipeline step (operation or conditional) */
export type PipelineStep = Operation | Conditional

/**
 * Pipeline - Sequence of operations
 */
export interface Pipeline {
	/** Ordered list of operations and conditionals */
	$pipe: PipelineStep[]
	/** What to return from the pipeline */
	$return?: Record<string, unknown>
}

/** DSL can be a single operation, conditional, or pipeline */
export type DSL = Operation | Conditional | Pipeline

// =============================================================================
// Plugin System
// =============================================================================

/** Effect handler function */
export type EffectHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
	args: TArgs,
	ctx: EvalContext
) => TResult | Promise<TResult>

/** Plugin definition */
export interface Plugin {
	/** Plugin namespace (e.g., "entity", "http", "email") */
	namespace: string
	/** Effect handlers */
	effects: Record<string, EffectHandler>
}

/** Evaluation context passed to effect handlers */
export interface EvalContext {
	/** Input data */
	input: Record<string, unknown>
	/** Results from previous operations */
	results: Record<string, unknown>
	/** Current timestamp */
	now?: Date
	/** Temp ID generator */
	tempId?: () => string
	/** Resolve a value (handles $input, $ref, etc.) */
	resolve: (value: unknown) => unknown
}

// =============================================================================
// Type Guards
// =============================================================================

export function isRefInput(v: unknown): v is RefInput {
	return typeof v === 'object' && v !== null && '$input' in v
}

export function isRefResult(v: unknown): v is RefResult {
	return typeof v === 'object' && v !== null && '$ref' in v
}

export function isRefNow(v: unknown): v is RefNow {
	return typeof v === 'object' && v !== null && '$now' in v
}

export function isRefTemp(v: unknown): v is RefTemp {
	return typeof v === 'object' && v !== null && '$temp' in v
}

export function isValueRef(v: unknown): v is ValueRef {
	return isRefInput(v) || isRefResult(v) || isRefNow(v) || isRefTemp(v)
}

export function isOperator(v: unknown): v is Operator {
	if (typeof v !== 'object' || v === null) return false
	return (
		'$inc' in v ||
		'$dec' in v ||
		'$push' in v ||
		'$pull' in v ||
		'$addToSet' in v ||
		'$default' in v ||
		'$if' in v
	)
}

export function isOperation(v: unknown): v is Operation {
	return typeof v === 'object' && v !== null && '$do' in v
}

export function isConditional(v: unknown): v is Conditional {
	return typeof v === 'object' && v !== null && '$when' in v && '$then' in v
}

export function isPipelineStep(v: unknown): v is PipelineStep {
	return isOperation(v) || isConditional(v)
}

export function isPipeline(v: unknown): v is Pipeline {
	return typeof v === 'object' && v !== null && '$pipe' in v && Array.isArray((v as Pipeline).$pipe)
}

export function isDSL(v: unknown): v is DSL {
	return isOperation(v) || isConditional(v) || isPipeline(v)
}
