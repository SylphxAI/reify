/**
 * UDSL - Mutations as Data
 *
 * Describe operations once, execute anywhere with plugins.
 *
 * This is the convenience package that re-exports everything.
 * For fine-grained control, use individual packages:
 * - @sylphx/udsl-core - Core types, builder, evaluator
 * - @sylphx/udsl-entity - Entity domain (CRUD operations)
 * - @sylphx/udsl-adapter-cache - Cache adapter
 * - @sylphx/udsl-adapter-prisma - Prisma adapter
 */

// =============================================================================
// Core - Types, Builder, Evaluator
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
	// Builder
	StepBuilder,
	// Results
	OperationResult,
	ConditionalResult,
	StepResult,
	PipelineResult,
} from "@sylphx/udsl-core";

export {
	// Type guards
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
} from "@sylphx/udsl-core";

// =============================================================================
// Entity Domain
// =============================================================================

export { entity, entityPlugin } from "@sylphx/udsl-entity";
export type { CreateArgs, UpdateArgs, DeleteArgs, UpsertArgs } from "@sylphx/udsl-entity";

// =============================================================================
// Adapters
// =============================================================================

export { createCachePlugin } from "@sylphx/udsl-adapter-cache";
export type { CacheLike, CachePluginOptions } from "@sylphx/udsl-adapter-cache";

export { createPrismaPlugin } from "@sylphx/udsl-adapter-prisma";
export type { PrismaLike, PrismaPluginOptions } from "@sylphx/udsl-adapter-prisma";
