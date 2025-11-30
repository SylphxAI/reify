import { beforeEach, describe, expect, it } from "bun:test";
import {
	branch,
	clearPlugins,
	entity,
	entityPlugin,
	execute,
	inc,
	now,
	pipe,
	ref,
	registerPlugin,
	resetTempIdCounter,
	temp,
} from "./index";

describe("UDSL Monorepo Integration", () => {
	beforeEach(() => {
		resetTempIdCounter();
		clearPlugins();
		registerPlugin(entityPlugin);
	});

	it("executes simple pipeline", async () => {
		const dsl = pipe(({ input }) => [
			entity.create("Session", { title: input.title }).as("session"),
		]);

		const result = await execute(dsl, { title: "My Session" });

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0]).toMatchObject({
			name: "session",
			effect: "entity.create",
			skipped: false,
		});
		expect((result.steps[0] as { result: unknown })?.result).toMatchObject({
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

		expect(result.steps).toHaveLength(2);
		expect((result.steps[0] as { result: unknown })?.result).toMatchObject({ id: "temp_1" });
		expect((result.steps[1] as { result: unknown })?.result).toMatchObject({ sessionId: "temp_1" });
	});

	it("executes conditional branch", async () => {
		const dsl = pipe(({ input }) => [
			branch(input.sessionId)
				.then(entity.update("Session", { id: input.sessionId, title: input.title }))
				.else(entity.create("Session", { title: input.title }))
				.as("session"),
		]);

		// With sessionId (then branch)
		const result1 = await execute(dsl, { sessionId: "sess_123", title: "Updated" });
		const step1 = result1.steps[0] as { branch: string; result: unknown };
		expect(step1.branch).toBe("then");
		expect(step1.result).toMatchObject({ $op: "update" });

		// Without sessionId (else branch)
		const result2 = await execute(dsl, { sessionId: null, title: "New" });
		const step2 = result2.steps[0] as { branch: string; result: unknown };
		expect(step2.branch).toBe("else");
		expect(step2.result).toMatchObject({ $op: "create" });
	});

	it("executes pipeline with operators", async () => {
		const dsl = pipe(({ input }) => [
			entity.update("User", { id: input.userId, count: inc(1) }).as("user"),
		]);

		const result = await execute(dsl, { userId: "user_123" });

		expect((result.steps[0] as { result: unknown })?.result).toMatchObject({
			$op: "update",
			$type: "User",
			count: { $inc: 1 },
		});
	});

	it("executes complex pipeline with now() and temp()", async () => {
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
				content: input.content,
			}).as("message"),
		]);

		const result = await execute(dsl, { title: "Chat", content: "Hello!" }, { now: timestamp });

		expect(result.steps).toHaveLength(2);
		expect((result.steps[0] as { result: unknown })?.result).toMatchObject({
			id: "temp_1",
			title: "Chat",
			createdAt: timestamp,
		});
		expect((result.steps[1] as { result: unknown })?.result).toMatchObject({
			id: "temp_2",
			sessionId: "temp_1",
			content: "Hello!",
		});
	});
});
