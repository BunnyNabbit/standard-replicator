// @ts-check
import { Resolver } from "../class/Resolver.mjs"

describe("Resolver", () => {
	it("should resolve Aon's handle", async () => {
		await expect(Resolver.resolveServiceFromHandle("bunnynabbit.com")).resolves.toBe("https://pds.bunnynabbit.com")
	})
	it("is unable to resolve invalid handle", async () => {
		await expect(Resolver.resolveServiceFromHandle("handle.invalid")).rejects.toThrow("Unable to resolve handle.")
	})
})
