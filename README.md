# UDSL

**Mutations as Data** — Describe operations once, execute anywhere with plugins.

```typescript
import { pipe, entity, ref, execute, createCachePlugin } from '@sylphx/udsl';

// Describe what you want to do
const createSession = pipe(({ input }) => [
  entity.create("Session", { title: input.title }).as("session"),
  entity.create("Message", {
    sessionId: ref("session").id,
    content: input.content
  }).as("message"),
]);

// Execute with any plugin
const cache = new Map();
await execute(createSession, { title: "Chat", content: "Hello" }, createCachePlugin(cache));
```

## Why UDSL?

| Traditional | UDSL |
|-------------|------|
| Logic scattered across client/server | Describe once, execute anywhere |
| Operations disappear after execution | Operations are data (storable, replayable) |
| Bound to specific runtime | Plugin-based execution |

## Core Concept

```
Builder  →  Operation Objects  →  Executor
   ↓              ↓                  ↓
Type-safe    Serializable      Plugin-based
```

**UDSL separates "what to do" from "how to do it".**

- **Builder**: Type-safe DSL for describing operations
- **Objects**: Plain JavaScript objects (serialize however you want)
- **Executor**: Plugins define how operations are executed

## Installation

```bash
npm install @sylphx/udsl
# or
bun add @sylphx/udsl
```

## Features

### Dependency Resolution

Reference results from previous operations:

```typescript
pipe(({ input }) => [
  entity.create("User", { name: input.name }).as("user"),
  entity.create("Profile", {
    userId: ref("user").id,  // References the created user's id
    bio: input.bio
  }).as("profile"),
]);
```

### Conditional Execution

Skip operations based on conditions:

```typescript
pipe(({ input }) => [
  entity.create("User", { name: input.name })
    .as("user")
    .only(input.shouldCreate),  // Only runs if truthy
]);
```

### Atomic Operators

Update operations with built-in operators:

```typescript
pipe(({ input }) => [
  entity.update("User", {
    id: input.userId,
    loginCount: inc(1),      // Increment
    tags: push("verified"),  // Push to array
    score: dec(5),           // Decrement
  }).as("user"),
]);
```

### Plugin System

Same operation description, different execution strategies:

```typescript
// Client: Update cache immediately (optimistic)
registerPlugin(createCachePlugin(cache));
await execute(mutation, data);

// Server: Persist to database
registerPlugin(createPrismaPlugin(prisma));
await execute(mutation, data);

// Testing: Dry run
registerPlugin(dryRunPlugin);
await execute(mutation, data);
```

## API Reference

### Builder Functions

| Function | Description |
|----------|-------------|
| `pipe(fn)` | Create operation pipeline |
| `entity.create(type, data)` | Create entity operation |
| `entity.update(type, data)` | Update entity operation |
| `entity.delete(type, id)` | Delete entity operation |
| `op(name, args)` | Generic operation |

### Value References

| Function | Description |
|----------|-------------|
| `input.field` | Reference input data |
| `ref("name").field` | Reference previous result |
| `now()` | Current timestamp |
| `temp()` | Generate temp ID |

### Operators

| Function | Description |
|----------|-------------|
| `inc(n)` | Increment number |
| `dec(n)` | Decrement number |
| `push(...items)` | Push to array |
| `pull(...items)` | Remove from array |
| `addToSet(...items)` | Add unique to array |
| `defaultTo(value)` | Default if undefined |
| `when(cond, then, else?)` | Conditional value |

### Adapters

| Adapter | Use Case |
|---------|----------|
| `createPrismaPlugin(prisma)` | Server-side DB execution |
| `createCachePlugin(cache)` | Client-side optimistic updates |
| `entityPlugin` | Returns operation descriptions (for custom handling) |

## Use Cases

### Optimistic Updates

```typescript
// Same mutation, different execution
const mutation = pipe(({ input }) => [
  entity.create("Message", { content: input.text }).as("msg"),
]);

// Client: Instant UI update
execute(mutation, data, cachePlugin);

// Server: Persist to DB
execute(mutation, data, prismaPlugin);
```

### Audit Logging

```typescript
// Store operations as data
await db.auditLog.insert({
  userId: ctx.user.id,
  operation: mutation,  // Plain object, store directly
  timestamp: new Date(),
});

// Replay later
const logs = await db.auditLog.findMany();
for (const log of logs) {
  await execute(log.operation, {});
}
```

### Custom Plugins

```typescript
const myPlugin: Plugin = {
  namespace: "email",
  effects: {
    send: async (args, ctx) => {
      const to = ctx.resolve(args.to);
      await sendEmail(to, args.subject, args.body);
      return { sent: true };
    },
  },
};

registerPlugin(myPlugin);

const workflow = pipe(({ input }) => [
  entity.create("User", { email: input.email }).as("user"),
  op("email.send", {
    to: ref("user").email,
    subject: "Welcome!"
  }).as("email"),
]);
```

## Serialization

Operation objects are plain JavaScript. Serialize however you want:

```typescript
const mutation = pipe(({ input }) => [...]);

// JSON
const json = JSON.stringify(mutation);

// MessagePack
const packed = msgpack.encode(mutation);

// Store in DB
await db.operations.insert({ data: mutation });
```

## License

MIT
