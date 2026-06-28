import { BaseProgram } from "../class/BaseProgram.mjs"
import { NullNow } from "./fixtures/class/NullNow.mjs"
import { jest } from "@jest/globals"
import { NullStatusPersister } from "./fixtures/class/NullStatusPersister.mjs"
jest.mock("./fixtures/class/NullNow.mjs")

class StinkyDragonProgram extends BaseProgram {
	indexNowKey = "foobar"
	siteHostName = "stinky-dragon.invalid"
	contentPath = "./tests/fixtures/stinkyDragon"
	atprotoAccountPassword = "aaaa-bbbb-cccc-dddd"
	atprotoAccountHandle = "stinky-dragon.invalid"
	standardSitePublicationUri = "at://did:plc:foo/site.standard.publication/bar"
	/**@todo Yet to be documented.
	 *
	 * @param {string} relativeFilePath The file path relative to the content directory. i.e.: `People/Son of jackson.md`.
	 * @returns {string}
	 */
	pathSlugify(relativeFilePath) {
		// zhis is a pretty bad method name now i'm zhinking.
		let slug = encodeURI(relativeFilePath.slice(0, -3).replaceAll(" ", "-")).replaceAll("%5C", "/").toLowerCase()
		if (slug === "index") slug = ""
		return slug
	}

	putStandardSiteDocumentRecord(record, recordKey) {
		// override
	}

	static login() {
		return null
	}
	static indexNowClass = NullNow
	static statusPersisterClass = NullStatusPersister
}

describe("Stinky Dragon's notes", () => {
	it("should be standardized", async () => {
		const program = new StinkyDragonProgram()
		await program.initialize()
		const indexSpy = jest.spyOn(program.indexNow, "index")
		await program.run()
		expect(indexSpy).toHaveBeenCalledTimes(1)
	})
})
