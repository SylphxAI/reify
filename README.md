# UDSL - Universal DSL

Language-agnostic, serializable expression language for building data pipelines.

## Features

- **Pure JSON output** - DSL compiles to plain JSON, no runtime dependencies
- **Type-safe builder** - TypeScript builder with full type inference
- **Plugin system** - Extensible via plugins (entity, http, custom)
- **Cross-language** - JSON spec can be evaluated in any language

## Installation

```bash
bun add @sylphx/udsl
```

## Quick Start

```typescript
import { pipe, entity, ref, now, execute, registerPlugin, entityPlugin } from '@sylphx/udsl';

// Register the entity plugin
registerPlugin(entityPlugin);

// Define a pipeline (compiles to JSON at define-time)
const dsl = pipe(({ input }) => [
  entity.create("Session", {
    title: input.title,
    createdAt: now(),
  }).as("session"),

  entity.create("Message", {
    sessionId: ref("session").id,
    content: input.content,
  }).as("message"),
]);

// Output is pure JSON:
// {
//   $pipe: [
//     { $do: "entity.create", $with: { type: "Session", ... }, $as: "session" },
//     { $do: "entity.create", $with: { type: "Message", ... }, $as: "message" }
//   ]
// }

// Execute with input data
const result = await execute(dsl, { title: 'Hello', content: 'World' });
```

## Core Primitives

UDSL has only 5 core primitives:

| Primitive | Description |
|-----------|-------------|
| `$do` | Effect to execute (namespaced, e.g., "entity.create") |
| `$with` | Arguments for the effect |
| `$as` | Name this result for later reference |
| `$when` | Only execute if condition is truthy |
| `$pipe` | Sequence of operations |

## Value References

| Syntax | JSON Output | Description |
|--------|-------------|-------------|
| `input.field` | `{ $input: "field" }` | Reference input data |
| `ref("name").field` | `{ $ref: "name.field" }` | Reference previous result |
| `now()` | `{ $now: true }` | Current timestamp |
| `temp()` | `{ $temp: true }` | Generate temp ID |

## Operators

| Syntax | JSON Output | Description |
|--------|-------------|-------------|
| `inc(n)` | `{ $inc: n }` | Increment number |
| `dec(n)` | `{ $dec: n }` | Decrement number |
| `push(...items)` | `{ $push: items }` | Push to array |
| `pull(...items)` | `{ $pull: items }` | Pull from array |
| `addToSet(...items)` | `{ $addToSet: items }` | Add to set |
| `defaultTo(value)` | `{ $default: value }` | Default if undefined |
| `when(cond, then, else?)` | `{ $if: {...} }` | Conditional value |

## Plugin System

UDSL is extensible via plugins:

```typescript
import { registerPlugin } from '@sylphx/udsl';

// Register custom plugin
registerPlugin({
  namespace: "http",
  effects: {
    get: async (args, ctx) => {
      const response = await fetch(args.url);
      return response.json();
    },
    post: async (args, ctx) => {
      const response = await fetch(args.url, {
        method: 'POST',
        body: JSON.stringify(ctx.resolve(args.body)),
      });
      return response.json();
    },
  },
});

// Use in pipeline
const dsl = pipe(({ input }) => [
  op("http.post", { url: "/api/users", body: input.data }).as("response"),
]);
```

### Built-in Plugins

#### Entity Plugin

```typescript
import { entityPlugin, registerPlugin } from '@sylphx/udsl';

registerPlugin(entityPlugin);

// Available effects:
// - entity.create
// - entity.update
// - entity.delete
// - entity.upsert
```

## Conditional Execution

```typescript
const dsl = pipe(({ input }) => [
  entity.create("Session", { title: input.title })
    .as("session")
    .only(input.shouldCreate),  // Only execute if truthy
]);
```

## JSON Schema

The DSL compiles to this JSON structure:

```typescript
interface Pipeline {
  $pipe: Operation[];
  $return?: Record<string, unknown>;
}

interface Operation {
  $do: string;                    // Effect name (namespaced)
  $with?: Record<string, unknown>; // Arguments
  $as?: string;                   // Result name
  $when?: unknown;                // Condition
}

type ValueRef =
  | { $input: string }  // Input reference
  | { $ref: string }    // Result reference
  | { $now: true }      // Timestamp
  | { $temp: true };    // Temp ID
```

## Why UDSL?

- **Universal**: Core primitives work for any domain (entity CRUD, HTTP, workflows)
- **Serializable**: Pure JSON, can be stored in DB, sent over network
- **Cross-language**: Evaluate in TypeScript, Python, Go, Rust, etc.
- **Type-safe**: Full TypeScript support with the builder API
- **Extensible**: Plugin system for custom effects

## License

MIT
