/**
 * @sylphx/udsl-entity
 *
 * Entity domain for UDSL - CRUD operations for entities.
 */

// Builder
export { entity } from "./builder";

// Plugin
export { entityPlugin, default } from "./plugin";
export type { CreateArgs, UpdateArgs, DeleteArgs, UpsertArgs } from "./plugin";
