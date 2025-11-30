/**
 * @sylphx/udsl-adapter-prisma
 *
 * Prisma Adapter for UDSL - Execute entity operations against Prisma.
 *
 * @example
 * ```typescript
 * import { PrismaClient } from "@prisma/client";
 * import { createPrismaPlugin } from "@sylphx/udsl-adapter-prisma";
 * import { registerPlugin, execute } from "@sylphx/udsl-core";
 * import { entity } from "@sylphx/udsl-entity";
 *
 * const prisma = new PrismaClient();
 * registerPlugin(createPrismaPlugin(prisma));
 *
 * const dsl = pipe(({ input }) => [
 *   entity.create("User", { name: input.name }).as("user"),
 * ]);
 *
 * // Actually creates in DB
 * await execute(dsl, { name: "John" });
 * ```
 */

import type { EvalContext, Plugin } from "@sylphx/udsl-core";

/** Minimal Prisma client interface */
export interface PrismaLike {
	[model: string]: {
		create: (args: { data: unknown }) => Promise<unknown>;
		update: (args: { where: { id: unknown }; data: unknown }) => Promise<unknown>;
		delete: (args: { where: { id: unknown } }) => Promise<unknown>;
		upsert: (args: {
			where: { id: unknown };
			create: unknown;
			update: unknown;
		}) => Promise<unknown>;
	};
}

export interface PrismaPluginOptions {
	/**
	 * Transform entity type to Prisma model name.
	 * Default: lowercases first letter (User -> user)
	 */
	modelName?: (type: string) => string;
}

/**
 * Create an entity plugin that executes against Prisma
 */
export function createPrismaPlugin(
	prisma: PrismaLike,
	options: PrismaPluginOptions = {},
): Plugin {
	const getModel = options.modelName ?? ((type: string) => type.charAt(0).toLowerCase() + type.slice(1));

	return {
		namespace: "entity",
		effects: {
			create: async (args: Record<string, unknown>, ctx: EvalContext) => {
				const { type, ...data } = args as { type: string; [key: string]: unknown };
				const model = getModel(type);
				const resolvedData = resolveData(data, ctx);
				return await prisma[model]!.create({ data: resolvedData });
			},

			update: async (args: Record<string, unknown>, ctx: EvalContext) => {
				const { type, id, ...data } = args as { type: string; id: string; [key: string]: unknown };
				const model = getModel(type);
				const resolvedData = resolveData(data, ctx);
				return await prisma[model]!.update({
					where: { id },
					data: resolvedData,
				});
			},

			delete: async (args: Record<string, unknown>, _ctx: EvalContext) => {
				const { type, id } = args as { type: string; id: string };
				const model = getModel(type);
				return await prisma[model]!.delete({ where: { id } });
			},

			upsert: async (args: Record<string, unknown>, ctx: EvalContext) => {
				const { type, id, ...data } = args as { type: string; id?: string; [key: string]: unknown };
				const model = getModel(type);
				const resolvedData = resolveData(data, ctx);

				if (id) {
					return await prisma[model]!.upsert({
						where: { id },
						create: { id, ...resolvedData },
						update: resolvedData,
					});
				}
				// No ID = create
				return await prisma[model]!.create({ data: resolvedData });
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

export default createPrismaPlugin;
