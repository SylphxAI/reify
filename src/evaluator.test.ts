import { beforeEach, describe, expect, it } from "bun:test";
import { entity, inc, now, op, pipe, ref, temp } from "./builder";
import {
	clearPlugins,
	execute,
	registerPlugin,
	resetTempIdCounter,
	resolveValue,
} from "./evaluator";
import { entityPlugin } from "./plugins/entity";
import type { EvalContext } from "./types";

describe("UDSL Evaluator", () => {
	beforeEach(() => {
		resetTempIdCounter();
		clearPlugins();
		registerPlugin(entityPlugin);
	});

	describe("resolveValue", () => {
		const createCtx = (input: Record<string, unknown>, results: Record<string, unknown> = {}): EvalContext => ({
			input,
			results,
			resolve: (v) => resolveValue(v, createCtx(input, results)),
		});

		it("resolves $input references", () => {
			const ctx = createCtx({ name: "John", nested: { value: 42 } });

			expect(resolveValue({ $input: "name" }, ctx)).toBe("John");
			expect(resolveValue({ $input: "nested.value" }, ctx)).toBe(42);
			expect(resolveValue({ $input: "missing" }, ctx)).toBeUndefined();
		});

		it("resolves $ref references", () => {
			const ctx = createCtx({}, { session: { id: "sess_123", title: "Test" } });

			expect(resolveValue({ $ref: "session.id" }, ctx)).toBe("sess_123");
			expect(resolveValue({ $ref: "session.title" }, ctx)).toBe("Test");
		});

		it("resolves $now reference", () => {
			const now = new Date("2024-01-01");
			const ctx: EvalContext = {
				input: {},
				results: {},
				now,
				resolve: (v) => resolveValue(v, ctx),
			};

			expect(resolveValue({ $now: true }, ctx)).toEqual(now);
		});

		it("resolves $temp reference", () => {
			const ctx = createCtx({});

			expect(resolveValue({ $temp: true }, ctx)).toBe("temp_1");
			expect(resolveValue({ $temp: true }, ctx)).toBe("temp_2");
		});

		it("resolves $temp with custom generator", () => {
			let counter = 0;
			const ctx: EvalContext = {
				input: {},
				results: {},
				tempId: () => `custom_${++counter}`,
				resolve: (v) => resolveValue(v, ctx),
			};

			expect(resolveValue({ $temp: true }, ctx)).toBe("custom_1");
			expect(resolveValue({ $temp: true }, ctx)).toBe("custom_2");
		});

		it("preserves operators", () => {
			const ctx = createCtx({});

			expect(resolveValue({ $inc: 1 }, ctx)).toEqual({ $inc: 1 });
			expect(resolveValue({ $dec: 5 }, ctx)).toEqual({ $dec: 5 });
			expect(resolveValue({ $push: "item" }, ctx)).toEqual({ $push: "item" });
			expect(resolveValue({ $pull: "item" }, ctx)).toEqual({ $pull: "item" });
			expect(resolveValue({ $addToSet: "item" }, ctx)).toEqual({ $addToSet: "item" });
		});

		it("resolves $if conditionals", () => {
			const ctx = createCtx({ isAdmin: true });

			expect(
				resolveValue({ $if: { cond: { $input: "isAdmin" }, then: "admin", else: "user" } }, ctx),
			).toBe("admin");

			ctx.input.isAdmin = false;
			expect(
				resolveValue({ $if: { cond: { $input: "isAdmin" }, then: "admin", else: "user" } }, ctx),
			).toBe("user");
		});

		it("resolves nested objects", () => {
			const ctx = createCtx({ name: "John", age: 30 });

			expect(
				resolveValue({ user: { $input: "name" }, info: { age: { $input: "age" } } }, ctx),
			).toEqual({ user: "John", info: { age: 30 } });
		});

		it("resolves arrays", () => {
			const ctx = createCtx({ a: 1, b: 2 });

			expect(resolveValue([{ $input: "a" }, { $input: "b" }, 3], ctx)).toEqual([1, 2, 3]);
		});

		it("handles truthy/falsy DSL semantics", () => {
			const ctx = createCtx({});
			const ifOp = (cond: unknown) => ({ $if: { cond, then: "yes", else: "no" } });

			// Falsy values
			expect(resolveValue(ifOp(null), ctx)).toBe("no");
			expect(resolveValue(ifOp(undefined), ctx)).toBe("no");
			expect(resolveValue(ifOp(false), ctx)).toBe("no");
			expect(resolveValue(ifOp(0), ctx)).toBe("no");
			expect(resolveValue(ifOp(""), ctx)).toBe("no");
			expect(resolveValue(ifOp([]), ctx)).toBe("no");

			// Truthy values
			expect(resolveValue(ifOp(true), ctx)).toBe("yes");
			expect(resolveValue(ifOp(1), ctx)).toBe("yes");
			expect(resolveValue(ifOp("hello"), ctx)).toBe("yes");
			expect(resolveValue(ifOp([1]), ctx)).toBe("yes");
			expect(resolveValue(ifOp({}), ctx)).toBe("yes");
		});
	});

	describe("execute", () => {
		it("executes simple pipeline", async () => {
			const dsl = pipe(({ input }) => [
				entity.create("Session", { title: input.title }).as("session"),
			]);

			const result = await execute(dsl, { title: "My Session" });

			expect(result.operations).toHaveLength(1);
			expect(result.operations[0]).toMatchObject({
				name: "session",
				effect: "entity.create",
				skipped: false,
			});
			expect(result.operations[0]?.result).toMatchObject({
				$op: "create",
				$type: "Session",
				title: "My Session",
			});
		});

		it("executes pipeline with $ref dependencies", async () => {
			const dsl = pipe(({ input }) => [
				entity.create("Session", { id: temp(), title: input.title }).as("session"),
				entity.create("Message", { sessionId: ref("session").id }).as("message"),
			]);

			const result = await execute(dsl, { title: "Test" });

			expect(result.operations).toHaveLength(2);
			// Session gets temp_1
			expect(result.operations[0]?.result).toMatchObject({ id: "temp_1" });
			// Message references session.id
			expect(result.operations[1]?.result).toMatchObject({ sessionId: "temp_1" });
		});

		it("executes pipeline with $when condition", async () => {
			const dsl = pipe(({ input }) => [
				entity.create("Session", { title: input.title }).as("session").only(input.shouldCreate),
			]);

			// With condition true
			const result1 = await execute(dsl, { title: "Test", shouldCreate: true });
			expect(result1.operations[0]?.skipped).toBe(false);

			// With condition false
			const result2 = await execute(dsl, { title: "Test", shouldCreate: false });
			expect(result2.operations[0]?.skipped).toBe(true);
		});

		it("executes pipeline with operators", async () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, count: inc(1) }).as("user"),
			]);

			const result = await execute(dsl, { userId: "user_123" });

			expect(result.operations[0]?.result).toMatchObject({
				$op: "update",
				$type: "User",
				count: { $inc: 1 },
			});
		});

		it("executes complex pipeline", async () => {
			const timestamp = new Date("2024-01-01");
			const dsl = pipe(({ input }) => [
				entity.create("Session", {
					id: temp(),
					title: input.title,
					createdAt: now(),
				}).as("session"),
				entity.create("Message", {
					id: temp(),
					sessionId: ref("session").id,
					role: "user",
					content: input.content,
				}).as("message"),
			]);

			const result = await execute(dsl, { title: "Chat", content: "Hello!" }, { now: timestamp });

			expect(result.operations).toHaveLength(2);

			// Session
			expect(result.operations[0]?.result).toMatchObject({
				$op: "create",
				$type: "Session",
				id: "temp_1",
				title: "Chat",
				createdAt: timestamp,
			});

			// Message
			expect(result.operations[1]?.result).toMatchObject({
				$op: "create",
				$type: "Message",
				id: "temp_2",
				sessionId: "temp_1",
				role: "user",
				content: "Hello!",
			});
		});

		it("returns results map", async () => {
			const dsl = pipe(({ input }) => [
				entity.create("User", { name: input.name }).as("user"),
			]);

			const result = await execute(dsl, { name: "John" });

			expect(result.result).toHaveProperty("user");
			expect(result.result.user).toMatchObject({
				$op: "create",
				$type: "User",
				name: "John",
			});
		});
	});

	describe("plugin system", () => {
		it("throws for unknown plugin", async () => {
			const dsl = { $pipe: [{ $do: "unknown.effect", $with: {} }] };

			await expect(execute(dsl, {})).rejects.toThrow("Unknown plugin namespace: unknown");
		});

		it("throws for unknown effect", async () => {
			const dsl = { $pipe: [{ $do: "entity.unknownEffect", $with: {} }] };

			await expect(execute(dsl, {})).rejects.toThrow("Unknown effect: entity.unknownEffect");
		});

		it("supports custom plugins", async () => {
			registerPlugin({
				namespace: "custom",
				effects: {
					greet: (args: { name: string }) => ({ message: `Hello, ${args.name}!` }),
				},
			});

			const dsl = pipe(({ input }) => [
				op("custom.greet", { name: input.name }).as("greeting"),
			]);

			const result = await execute(dsl, { name: "World" });

			expect(result.result.greeting).toEqual({ message: "Hello, World!" });
		});
	});
});
