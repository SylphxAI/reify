import { describe, expect, it } from "bun:test";
import { addToSet, dec, defaultTo, entity, inc, now, op, pipe, pull, push, ref, single, temp, when } from "./builder";

describe("UDSL Builder", () => {
	describe("pipe", () => {
		it("builds simple pipeline", () => {
			const dsl = pipe(({ input }) => [
				entity.create("Session", { title: input.title }).as("session"),
			]);

			expect(dsl).toEqual({
				$pipe: [
					{
						$do: "entity.create",
						$with: { type: "Session", title: { $input: "title" } },
						$as: "session",
					},
				],
			});
		});

		it("builds pipeline with multiple operations", () => {
			const dsl = pipe(({ input }) => [
				entity.create("Session", { title: input.title }).as("session"),
				entity.create("Message", { sessionId: ref("session").id, content: input.content }).as("message"),
			]);

			expect(dsl.$pipe).toHaveLength(2);
			expect(dsl.$pipe[0]).toEqual({
				$do: "entity.create",
				$with: { type: "Session", title: { $input: "title" } },
				$as: "session",
			});
			expect(dsl.$pipe[1]).toEqual({
				$do: "entity.create",
				$with: {
					type: "Message",
					sessionId: { $ref: "session.id" },
					content: { $input: "content" },
				},
				$as: "message",
			});
		});

		it("supports conditional execution with .only()", () => {
			const dsl = pipe(({ input }) => [
				entity.create("Session", { title: input.title }).as("session").only(input.shouldCreate),
			]);

			expect(dsl.$pipe[0]).toEqual({
				$do: "entity.create",
				$with: { type: "Session", title: { $input: "title" } },
				$as: "session",
				$when: { $input: "shouldCreate" },
			});
		});
	});

	describe("single", () => {
		it("builds single operation", () => {
			const dsl = single(({ input }) =>
				entity.create("User", { name: input.name }).as("user")
			);

			expect(dsl).toEqual({
				$do: "entity.create",
				$with: { type: "User", name: { $input: "name" } },
				$as: "user",
			});
		});
	});

	describe("op", () => {
		it("creates generic operation", () => {
			const dsl = pipe(({ input }) => [
				op("http.post", { url: "/api/users", body: input.data }).as("response"),
			]);

			expect(dsl.$pipe[0]).toEqual({
				$do: "http.post",
				$with: { url: "/api/users", body: { $input: "data" } },
				$as: "response",
			});
		});
	});

	describe("entity helpers", () => {
		it("entity.create", () => {
			const dsl = pipe(({ input }) => [
				entity.create("User", { name: input.name }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$do).toBe("entity.create");
			expect(dsl.$pipe[0]?.$with).toEqual({ type: "User", name: { $input: "name" } });
		});

		it("entity.update", () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, name: input.name }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$do).toBe("entity.update");
			expect(dsl.$pipe[0]?.$with).toEqual({
				type: "User",
				id: { $input: "userId" },
				name: { $input: "name" },
			});
		});

		it("entity.delete", () => {
			const dsl = pipe(({ input }) => [
				entity.delete("User", input.userId).as("deleted"),
			]);

			expect(dsl.$pipe[0]?.$do).toBe("entity.delete");
			expect(dsl.$pipe[0]?.$with).toEqual({ type: "User", id: { $input: "userId" } });
		});

		it("entity.upsert", () => {
			const dsl = pipe(({ input }) => [
				entity.upsert("User", { id: input.userId, name: input.name }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$do).toBe("entity.upsert");
		});
	});

	describe("value references", () => {
		it("ref() creates result reference", () => {
			const dsl = pipe(() => [
				entity.create("Session", {}).as("session"),
				entity.create("Message", { sessionId: ref("session").id }).as("message"),
			]);

			expect(dsl.$pipe[1]?.$with?.sessionId).toEqual({ $ref: "session.id" });
		});

		it("ref() supports nested paths", () => {
			const dsl = pipe(() => [
				entity.create("User", {}).as("user"),
				entity.create("Profile", { location: ref("user").settings.location }).as("profile"),
			]);

			expect(dsl.$pipe[1]?.$with?.location).toEqual({ $ref: "user.settings.location" });
		});

		it("now() creates timestamp reference", () => {
			const dsl = pipe(() => [
				entity.create("Session", { createdAt: now() }).as("session"),
			]);

			expect(dsl.$pipe[0]?.$with?.createdAt).toEqual({ $now: true });
		});

		it("temp() creates temp ID reference", () => {
			const dsl = pipe(() => [
				entity.create("Session", { id: temp() }).as("session"),
			]);

			expect(dsl.$pipe[0]?.$with?.id).toEqual({ $temp: true });
		});
	});

	describe("operators", () => {
		it("inc() creates increment operator", () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, count: inc(1) }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with?.count).toEqual({ $inc: 1 });
		});

		it("dec() creates decrement operator", () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, count: dec(5) }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with?.count).toEqual({ $dec: 5 });
		});

		it("push() creates push operator", () => {
			const dsl = pipe(({ input }) => [
				entity.update("Post", { id: input.postId, tags: push("featured") }).as("post"),
			]);

			expect(dsl.$pipe[0]?.$with?.tags).toEqual({ $push: "featured" });
		});

		it("push() with multiple items", () => {
			const dsl = pipe(({ input }) => [
				entity.update("Post", { id: input.postId, tags: push("a", "b", "c") }).as("post"),
			]);

			expect(dsl.$pipe[0]?.$with?.tags).toEqual({ $push: ["a", "b", "c"] });
		});

		it("pull() creates pull operator", () => {
			const dsl = pipe(({ input }) => [
				entity.update("Post", { id: input.postId, tags: pull("draft") }).as("post"),
			]);

			expect(dsl.$pipe[0]?.$with?.tags).toEqual({ $pull: "draft" });
		});

		it("addToSet() creates addToSet operator", () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, roles: addToSet("admin") }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with?.roles).toEqual({ $addToSet: "admin" });
		});

		it("defaultTo() creates default operator", () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, bio: defaultTo("No bio") }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with?.bio).toEqual({ $default: "No bio" });
		});

		it("when() creates conditional operator", () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, role: when(input.isAdmin, "admin", "user") }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with?.role).toEqual({
				$if: {
					cond: { $input: "isAdmin" },
					then: "admin",
					else: "user",
				},
			});
		});

		it("when() without else", () => {
			const dsl = pipe(({ input }) => [
				entity.update("User", { id: input.userId, verified: when(input.hasEmail, true) }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with?.verified).toEqual({
				$if: {
					cond: { $input: "hasEmail" },
					then: true,
					else: undefined,
				},
			});
		});
	});

	describe("input proxy", () => {
		it("converts simple field access", () => {
			const dsl = pipe(({ input }) => [
				entity.create("User", { name: input.name, email: input.email }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with).toEqual({
				type: "User",
				name: { $input: "name" },
				email: { $input: "email" },
			});
		});

		it("converts nested field access", () => {
			const dsl = pipe<{ user: { profile: { name: string } } }>(({ input }) => [
				entity.create("User", { name: input.user.profile.name }).as("user"),
			]);

			expect(dsl.$pipe[0]?.$with?.name).toEqual({ $input: "user.profile.name" });
		});
	});

	describe("serialization", () => {
		it("output is pure JSON", () => {
			const dsl = pipe(({ input }) => [
				entity.create("User", { name: input.name, createdAt: now() }).as("user"),
			]);

			const json = JSON.stringify(dsl);
			const parsed = JSON.parse(json);

			expect(parsed).toEqual({
				$pipe: [
					{
						$do: "entity.create",
						$with: { type: "User", name: { $input: "name" }, createdAt: { $now: true } },
						$as: "user",
					},
				],
			});
		});

		it("preserves literal values", () => {
			const dsl = pipe(({ input }) => [
				entity.create("Message", {
					role: "user",
					priority: 1,
					draft: false,
					content: input.content,
				}).as("message"),
			]);

			expect(dsl.$pipe[0]?.$with).toEqual({
				type: "Message",
				role: "user",
				priority: 1,
				draft: false,
				content: { $input: "content" },
			});
		});
	});
});
