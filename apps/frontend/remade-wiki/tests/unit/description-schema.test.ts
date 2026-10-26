import * as v from "valibot";
import { describe, expect, it } from "vitest";
import {
	projectSchema,
	requestSchema,
	toolSchema,
} from "../../src/lib/schemas";

describe.each([
	["project", projectSchema.entries.description],
	["tool", toolSchema.entries.description],
] as const)("%s descriptions", (_kind, schema) => {
	it.each([
		[19, false],
		[20, true],
		[400, true],
		[401, true],
		[429, true],
		[500, true],
		[501, false],
	] as const)("validates the boundary at %i characters", (length, valid) => {
		expect(v.safeParse(schema, "x".repeat(length)).success).toBe(valid);
	});

	it.each([" ".repeat(500), `<b>${"x".repeat(429)}</b>`])(
		"rejects blank or HTML descriptions",
		(value) => {
			expect(v.safeParse(schema, value).success).toBe(false);
		},
	);
});

it("keeps limitations and request reasons capped at 400 characters", () => {
	const value = "x".repeat(401);

	expect(v.safeParse(projectSchema.entries.limitations, value).success).toBe(
		false,
	);
	expect(v.safeParse(toolSchema.entries.limitations, value).success).toBe(
		false,
	);
	expect(v.safeParse(requestSchema.entries.reason, value).success).toBe(false);
});

describe.each([
	["project", projectSchema.entries.summary],
	["tool", toolSchema.entries.summary],
	["request", requestSchema.entries.summary],
] as const)("%s card summaries", (_kind, schema) => {
	it.each([
		["x", true],
		["x".repeat(144), true],
		["x".repeat(145), false],
		["🎨".repeat(144), true],
		["🎨".repeat(145), false],
		["", false],
		["   ", false],
		[" leading", false],
		["trailing ", false],
		["two\nlines", false],
		["two\rlines", false],
		["<b>HTML</b>", false],
		[undefined, false],
		[null, false],
	] as const)("validates summary %j", (value, valid) => {
		expect(v.safeParse(schema, value).success).toBe(valid);
	});
});
