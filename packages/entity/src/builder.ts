/**
 * Entity Domain Builder
 *
 * Fluent API for entity CRUD operations.
 */

import { op, type StepBuilder } from "@sylphx/udsl-core";

interface OperationBuilder extends StepBuilder {
	as(name: string): OperationBuilder;
	only(condition: unknown): OperationBuilder;
}

/**
 * Entity operations builder
 *
 * @example
 * ```typescript
 * entity.create("User", { name: input.name }).as("user")
 * entity.update("User", { id: input.id, name: "New" }).as("user")
 * entity.delete("User", input.id).as("deleted")
 * entity.upsert("User", { id: input.id, name: input.name }).as("user")
 * ```
 */
export const entity = {
	/**
	 * Create entity
	 * entity.create("User", { name: input.name }).as("user")
	 */
	create(type: string, data: Record<string, unknown> = {}): OperationBuilder {
		return op("entity.create", { type, ...data }) as OperationBuilder;
	},

	/**
	 * Update entity
	 * entity.update("User", { id: input.id, name: "New" }).as("user")
	 */
	update(type: string, data: Record<string, unknown>): OperationBuilder {
		return op("entity.update", { type, ...data }) as OperationBuilder;
	},

	/**
	 * Delete entity
	 * entity.delete("User", input.id).as("deleted")
	 */
	delete(type: string, id: unknown): OperationBuilder {
		return op("entity.delete", { type, id }) as OperationBuilder;
	},

	/**
	 * Upsert entity
	 * entity.upsert("User", { id: input.id, name: input.name }).as("user")
	 */
	upsert(type: string, data: Record<string, unknown>): OperationBuilder {
		return op("entity.upsert", { type, ...data }) as OperationBuilder;
	},
};
