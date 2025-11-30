/**
 * Entity Domain Builder
 *
 * Fluent API for entity CRUD operations.
 * Supports type-safe operations via StandardEntity protocol.
 */

import {
	op,
	type StepBuilder,
	type RefTemp,
	type RefNow,
	type RefInput,
	type RefResult,
	type RefProxy,
	type Operator,
} from "@sylphx/reify-core";

// =============================================================================
// Standard Entity Protocol
// =============================================================================

/**
 * Standard Entity Protocol
 *
 * Any library can implement this interface to enable type-safe entity operations.
 * Similar to Standard Schema pattern - structural typing without direct imports.
 *
 * The protocol supports two ways to provide type information:
 * 1. Direct `type` property with the data type (simple)
 * 2. `fields` property that can be used to infer the type (Lens-style)
 *
 * @example
 * ```typescript
 * // Lens EntityDef implements this with fields
 * interface EntityDef<Name, Fields> {
 *   "~entity": { name: Name; type: unknown };
 *   fields: Fields;
 * }
 *
 * // Now entity.create() is fully typed!
 * entity.create(Message, { content: "hello" })  // ✅ type-checked
 * ```
 */
export interface StandardEntity<TName extends string = string, TData = unknown> {
	/** Standard Entity marker with phantom types */
	readonly "~entity": {
		/** Entity name */
		readonly name: TName;
		/** Entity data type (can be unknown if using fields-based inference) */
		readonly type: TData;
	};
	/** Optional fields for type inference (Lens-style entities) */
	readonly fields?: unknown;
}

/** Check if value implements StandardEntity protocol */
export function isStandardEntity(value: unknown): value is StandardEntity {
	return (
		typeof value === "object" &&
		value !== null &&
		"~entity" in value &&
		typeof (value as StandardEntity)["~entity"] === "object"
	);
}

/** Extract entity name from StandardEntity or string */
type EntityName<T> = T extends StandardEntity<infer N, unknown> ? N : T extends string ? T : never;

/**
 * Infer scalar type from Lens field definition.
 * Supports common Lens field types.
 */
type InferLensScalar<F> = F extends { _type: "id" | "string" }
	? string
	: F extends { _type: "int" | "float" | "decimal" }
		? number
		: F extends { _type: "boolean" }
			? boolean
			: F extends { _type: "datetime" | "date" }
				? Date
				: F extends { _type: "enum"; values: readonly (infer V)[] }
					? V
					: F extends { _optional: true; _inner: infer I }
						? InferLensScalar<I> | undefined
						: unknown;

/**
 * Infer entity data type from Lens-style fields.
 */
type InferFromLensFields<F> = F extends Record<string, unknown>
	? {
			[K in keyof F as F[K] extends { _type: string } | { _optional: true } ? K : never]: InferLensScalar<F[K]>;
		}
	: Record<string, unknown>;

/**
 * Extract raw entity data type from StandardEntity.
 * Supports both direct type and Lens-style fields inference.
 */
type RawEntityData<T> = T extends { fields: infer F }
	? InferFromLensFields<F>
	: T extends StandardEntity<string, infer D>
		? D extends unknown
			? Record<string, unknown>
			: D
		: Record<string, unknown>;

// =============================================================================
// DSL Value Types - Allow DSL references in place of actual values
// =============================================================================

/** Any DSL reference type that can be used in place of actual values */
type AnyDslRef = RefTemp | RefNow | RefInput | RefResult | RefProxy | Operator;

/**
 * Allow either the actual type T or any DSL reference.
 */
type WithDsl<T> = T | AnyDslRef;

/**
 * Transform entity data to allow DSL references for each property.
 */
type DslifyData<T> = {
	[K in keyof T]: WithDsl<T[K]>;
};

/**
 * Entity data with DSL support.
 * Each field can be either its actual type or a DSL reference.
 */
type EntityData<T> = DslifyData<RawEntityData<T>>;

/** Get entity name at runtime */
function getEntityName<T extends string | StandardEntity>(entity: T): string {
	if (typeof entity === "string") return entity;
	return (entity as StandardEntity)["~entity"].name;
}

// =============================================================================
// Operation Builder
// =============================================================================

interface OperationBuilder extends StepBuilder {
	as(name: string): OperationBuilder;
	only(condition: unknown): OperationBuilder;
}

// =============================================================================
// Entity Operations
// =============================================================================

/**
 * Entity operations builder
 *
 * Supports both string-based (untyped) and StandardEntity-based (typed) operations.
 *
 * @example
 * ```typescript
 * // Untyped (string-based)
 * entity.create("User", { name: input.name }).as("user")
 *
 * // Typed (StandardEntity-based) - requires implementing library (e.g., Lens)
 * entity.create(User, { name: input.name }).as("user")  // ✅ type-checked!
 * ```
 */
export const entity = {
	/**
	 * Create entity
	 *
	 * @example
	 * ```typescript
	 * entity.create("User", { name: input.name }).as("user")
	 * entity.create(User, { name: input.name }).as("user")  // typed!
	 * ```
	 */
	create<T extends string | StandardEntity>(
		typeOrEntity: T,
		data: Partial<EntityData<T>> = {},
	): OperationBuilder {
		const type = getEntityName(typeOrEntity);
		return op("entity.create", { type, ...data }) as OperationBuilder;
	},

	/**
	 * Update entity
	 *
	 * @example
	 * ```typescript
	 * entity.update("User", { id: input.id, name: "New" }).as("user")
	 * entity.update(User, { id: input.id, name: "New" }).as("user")  // typed!
	 * ```
	 */
	update<T extends string | StandardEntity>(
		typeOrEntity: T,
		data: Partial<EntityData<T>> & { id: unknown },
	): OperationBuilder {
		const type = getEntityName(typeOrEntity);
		return op("entity.update", { type, ...data }) as OperationBuilder;
	},

	/**
	 * Delete entity
	 *
	 * @example
	 * ```typescript
	 * entity.delete("User", input.id).as("deleted")
	 * entity.delete(User, input.id).as("deleted")  // typed!
	 * ```
	 */
	delete<T extends string | StandardEntity>(typeOrEntity: T, id: unknown): OperationBuilder {
		const type = getEntityName(typeOrEntity);
		return op("entity.delete", { type, id }) as OperationBuilder;
	},

	/**
	 * Upsert entity
	 *
	 * @example
	 * ```typescript
	 * entity.upsert("User", { id: input.id, name: input.name }).as("user")
	 * entity.upsert(User, { id: input.id, name: input.name }).as("user")  // typed!
	 * ```
	 */
	upsert<T extends string | StandardEntity>(
		typeOrEntity: T,
		data: Partial<EntityData<T>> & { id: unknown },
	): OperationBuilder {
		const type = getEntityName(typeOrEntity);
		return op("entity.upsert", { type, ...data }) as OperationBuilder;
	},
};
