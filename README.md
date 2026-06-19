# Reify

> **To reify** (/ˈriːɪfaɪ/): To make something abstract real and concrete.

---

In programming, operations are ephemeral. They execute, produce effects, and vanish—leaving no trace of their existence.

**Reify changes this.**

Reify transforms operations into **first-class data**. Operations become tangible artifacts that can be inspected, stored, transmitted, transformed, and executed across any environment.

```typescript
// An operation, crystallized as data
const operation = pipe(({ input }) => [
  entity.create("Document", {
    id: temp(),
    title: input.title,
    createdAt: now(),
  }).as("doc"),
]);

// The same operation, executable anywhere
await execute(operation, data, [cachePlugin]);   // In memory
await execute(operation, data, [prismaPlugin]);  // In database
await execute(operation, data, [customPlugin]);  // Anywhere
```

---

## Philosophy

### Operations as Data

Traditional programming conflates **what** to do with **how** to do it:

```typescript
// The operation and its execution are inseparable
await prisma.user.create({ data: { name: "Alice" } });
```

Reify separates them:

```typescript
// What to do (pure data)
const what = entity.create("User", { name: input.name });

// How to do it (pluggable execution)
await execute(what, data, [anyPlugin]);
```

This separation unlocks capabilities impossible with traditional code:

| Capability | Traditional | Reify |
|------------|-------------|-------|
| Inspect operations before execution | ❌ | ✅ |
| Store operations for later | ❌ | ✅ |
| Transmit operations across network | ❌ | ✅ |
| Replay operations | ❌ | ✅ |
| Execute in different environments | ❌ | ✅ |
| Transform operations programmatically | ❌ | ✅ |

### The Reification Principle

```
Code → Data → Execution
```

1. **Code** (Builder): Type-safe construction of operations
2. **Data** (Pipeline): Pure, serializable representation
3. **Execution** (Plugin): Environment-specific interpretation

The data layer is the **universal interface**. It belongs to no environment, yet works in all of them.

---

## Installation

```bash
npm install @sylphx/reify
```

---

## Core API

### Describing Operations

```typescript
import { pipe, entity, ref, temp, now, branch, inc } from '@sylphx/reify';

const workflow = pipe(({ input }) => [
  // Create with generated ID and timestamp
  entity.create("Session", {
    id: temp(),
    title: input.title,
    createdAt: now(),
  }).as("session"),

  // Reference previous results
  entity.create("Message", {
    id: temp(),
    sessionId: ref("session").id,
    content: input.content,
  }).as("message"),

  // Conditional logic
  branch(input.notify)
    .then(entity.create("Notification", { userId: input.userId }))
    .else(entity.update("User", { id: input.userId, lastActive: now() }))
    .as("action"),

  // Atomic operators
  entity.update("User", {
    id: input.userId,
    messageCount: inc(1),
  }).as("stats"),
]);
```

### Executing Operations

```typescript
import { execute, registerPlugin, entityPlugin } from '@sylphx/reify';

// Register execution strategy
registerPlugin(entityPlugin);

// Execute with input
const result = await execute(workflow, {
  title: "My Session",
  content: "Hello, World",
  userId: "user_123",
  notify: true,
});

// Access step results
result.steps.session;  // Created session
result.steps.message;  // Created message
```

### Serialization

Operations are plain JavaScript objects:

```typescript
// Serialize to JSON
const json = JSON.stringify(workflow);

// Store in database
await db.operations.insert({ data: workflow });

// Transmit over network
socket.send(json);

// Reconstruct and execute
const restored = JSON.parse(json);
await execute(restored, input, plugins);
```

---

## Building Blocks

### Value References

| Reference | Description | Example |
|-----------|-------------|---------|
| `input.field` | Access input data | `input.userId` |
| `ref("step").field` | Reference previous result | `ref("user").id` |
| `temp()` | Generate temporary ID | `id: temp()` |
| `now()` | Current timestamp | `createdAt: now()` |

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `inc(n)` | Increment | `count: inc(1)` |
| `dec(n)` | Decrement | `score: dec(5)` |
| `push(...items)` | Append to array | `tags: push("new")` |
| `pull(...items)` | Remove from array | `tags: pull("old")` |
| `addToSet(...items)` | Add unique | `roles: addToSet("admin")` |
| `when(cond, then, else?)` | Conditional value | `status: when(input.active, "on", "off")` |

### Control Flow

```typescript
// Conditional execution
branch(condition)
  .then(operationIfTrue)
  .else(operationIfFalse)
  .as("result")
```

---

## Plugin System

Plugins define how operations are executed. The same operation can behave differently based on the plugin:

```typescript
// Define a custom plugin
const loggingPlugin = {
  namespace: "entity",
  effects: {
    create: async (args, ctx) => {
      console.log("Creating:", args);
      return args;
    },
    update: async (args, ctx) => {
      console.log("Updating:", args);
      return args;
    },
  },
};

registerPlugin(loggingPlugin);
```

### Built-in Adapters

| Adapter | Purpose |
|---------|---------|
| `@sylphx/reify-adapter-cache` | In-memory cache execution |
| `@sylphx/reify-adapter-prisma` | Prisma database execution |

---

## Packages

| Package | Description |
|---------|-------------|
| `@sylphx/reify` | Complete package (recommended) |
| `@sylphx/reify-core` | Core primitives: pipe, execute, ref, temp... |
| `@sylphx/reify-entity` | Entity operations: create, update, delete, upsert |
| `@sylphx/reify-adapter-cache` | Cache execution adapter |
| `@sylphx/reify-adapter-prisma` | Prisma execution adapter |

---

## Use Cases

### Audit Logging
Every operation is data. Store them for complete audit trails.

### Undo/Redo
Operations can be stored and replayed. Reverse them for undo.

### Event Sourcing
Operations are events. Rebuild state by replaying the event log.

### Multi-Environment Sync
Same operation, different execution targets. Keep systems in sync.

### Testing
Mock plugins for testing without real infrastructure.

### Optimistic Updates
Execute operations on local cache immediately while syncing with server.

---

## Design Principles

1. **Data over Code**: Operations should be inspectable and manipulable
2. **Separation of Concerns**: Description is independent of execution
3. **Universality**: The same operation works everywhere
4. **Type Safety**: Full TypeScript inference throughout
5. **Minimalism**: Small core, extensible through plugins

---

## Powered by Sylphx

Built with [@sylphx/tsconfig](https://github.com/SylphxAI/tsconfig), [@sylphx/biome-config](https://github.com/SylphxAI/biome-config), and [@sylphx/bump](https://github.com/SylphxAI/bump).

https://github.com/SylphxAI

## License

MIT
