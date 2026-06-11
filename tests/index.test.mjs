// @ts-check

describe("index", () => {
	it("should import", async () => {
		expect(await import("../index.mjs")).toBeTruthy()
	})
})
