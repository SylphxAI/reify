/**
 * @sylphx/reify-core
 *
 * Domain-agnostic primitives for reified operations.
 * Use with domain plugins (entity, email, etc.) for actual operations.
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
	Conditional,
	PipelineStep,
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
	isConditional,
	isPipelineStep,
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
	// Conditional builder
	branch,
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

export type { StepBuilder, RefProxy } from "./builder";

// =============================================================================
// Evaluator
// =============================================================================

export type { OperationResult, ConditionalResult, StepResult, PipelineResult } from "./evaluator";
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
	executeConditional,
	// Value resolution
	resolveValue,
	resetTempIdCounter,
	// Errors
	EvaluationError,
} from "./evaluator";
