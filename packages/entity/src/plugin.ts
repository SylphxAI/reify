/**
 * Entity Plugin
 *
 * Returns operation descriptions for entity CRUD.
 * Use adapter plugins for actual execution.
 */

import type { EvalContext, Plugin } from "@sylphx/udsl-core";

/** Entity create args */
export interface CreateArgs {
	/** Entity type */
	type: string;
	/** Entity data */
	[key: string]: unknown;
}

/** Entity update args */
export interface UpdateArgs {
	/** Entity type */
	type: string;
	/** Entity ID */
	id: string;
	/** Fields to update */
	[key: string]: unknown;
}

/** Entity delete args */
export interface DeleteArgs {
	/** Entity type */
	type: string;
	/** Entity ID */
	id: string;
	[key: string]: unknown;
}

/** Entity upsert args */
export interface UpsertArgs {
	/** Entity type */
	type: string;
	/** Entity ID (optional for create) */
	id?: string;
	/** Entity data */
	[key: string]: unknown;
}

/**
 * Entity plugin
 *
 * By default, returns the operation description.
 * Override handlers for actual database operations.
 */
export const entityPlugin: Plugin = {
	namespace: "entity",
	effects: {
		/**
		 * Create a new entity
		 * { $do: "entity.create", $with: { type: "User", name: "John" } }
		 */
		create: (args: Record<string, unknown>, ctx: EvalContext) => {
			const { type, ...data } = args as CreateArgs;
			const id = data.id ?? ctx.tempId?.() ?? `temp_${Date.now()}`;
			return { $op: "create", $type: type, id, ...data };
		},

		/**
		 * Update an existing entity
		 * { $do: "entity.update", $with: { type: "User", id: "123", name: "Jane" } }
		 */
		update: (args: Record<string, unknown>, _ctx: EvalContext) => {
			const { type, id, ...data } = args as UpdateArgs;
			return { $op: "update", $type: type, id, ...data };
		},

		/**
		 * Delete an entity
		 * { $do: "entity.delete", $with: { type: "User", id: "123" } }
		 */
		delete: (args: Record<string, unknown>, _ctx: EvalContext) => {
			const { type, id } = args as DeleteArgs;
			return { $op: "delete", $type: type, id };
		},

		/**
		 * Upsert an entity (create or update)
		 * { $do: "entity.upsert", $with: { type: "User", id: "123", name: "John" } }
		 */
		upsert: (args: Record<string, unknown>, ctx: EvalContext) => {
			const { type, id, ...data } = args as UpsertArgs;
			const entityId = id ?? ctx.tempId?.() ?? `temp_${Date.now()}`;
			const op = id ? "update" : "create";
			return { $op: op, $type: type, id: entityId, ...data };
		},
	},
};

export default entityPlugin;
