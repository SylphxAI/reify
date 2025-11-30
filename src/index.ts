/**
 * UDSL - Universal DSL
 *
 * Language-agnostic, serializable expression language.
 */

// =============================================================================
// Types
// =============================================================================

export type {
	// Value references
	RefInput,
	RefResult,
	RefNow,
	RefTemp,
	ValueRef,
	// Operators
	OpInc,
	OpDec,
	OpPush,
	OpPull,
	OpAddToSet,
	OpDefault,
	OpIf,
	Operator,
	// Core primitives
	Operation,
	Pipeline,
	DSL,
	// Plugin system
	EffectHandler,
	Plugin,
	EvalContext,
} from "./types";

// Type guards
export {
	isRefInput,
	isRefResult,
	isRefNow,
	isRefTemp,
	isValueRef,
	isOperator,
	isOperation,
	isPipeline,
	isDSL,
} from "./types";

// =============================================================================
// Builder
// =============================================================================

export {
	// Pipeline builder
	pipe,
	single,
	// Operation builder
	op,
	// Entity helpers (sugar)
	entity,
	// Value references
	ref,
	now,
	temp,
	// Operators
	inc,
	dec,
	push,
	pull,
	addToSet,
	defaultTo,
	when,
	// Internal
	createInputProxy,
} from "./builder";

// =============================================================================
// Evaluator
// =============================================================================

export type { OperationResult, PipelineResult } from "./evaluator";
export {
	// Plugin registry
	registerPlugin,
	unregisterPlugin,
	clearPlugins,
	getPluginNamespaces,
	// Execution
	execute,
	executePipeline,
	executeOperation,
	// Value resolution
	resolveValue,
	resetTempIdCounter,
	// Errors
	EvaluationError,
} from "./evaluator";

// =============================================================================
// Built-in Plugins
// =============================================================================

export { entityPlugin } from "./plugins/index";
export type { CreateArgs, UpdateArgs, DeleteArgs, UpsertArgs } from "./plugins/index";
