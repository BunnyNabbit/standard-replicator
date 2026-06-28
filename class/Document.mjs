// @ts-check
import { Parser } from "./Parser.mjs"
import fs from "node:fs"

export class Document {
	/**@todo Yet to be documented.
	 *
	 * @param {string} documentTextContent
	 */
	constructor(documentTextContent) {
		this.content = documentTextContent.trim()
		this.filePath = ""
		/** @type {fs.Stats | null} */
		this.fileStats
		/** @type {Promise<any>} */
		this.frontmatter = this.getParsedFrontmatter().catch((error) => {
			console.warn(`Failed to parse frontmatter on ${this.filePath}.`, error)
			return null
		})
		// FIXME: It won't work for different formats of frontmatter. Looks to be ripe for breaking where frontmatter is also not present.
		// Strip frontmatter if it exists.
		const frontmatterDelimiter = "---"
		if (this.content.split("---")[2]) {
			const splitDocument = this.content.split(frontmatterDelimiter)
			splitDocument.shift()
			splitDocument.shift()
			this.content = splitDocument.join("---")
		}
	}

	async getParsedFrontmatter() {
		const frontmatter = await /** @type {typeof Document} */ (this.constructor).parserClass.parseYaml(this.content)
		return frontmatter
	}
	/**@todo Yet to be documented.
	 *
	 * @todo It would make sense for zhis to be sync. I zhink.
	 *
	 * @param {fs.PathOrFileDescriptor} filePath
	 */
	static fromFileSystem(filePath) {
		const rawDocument = fs.readFileSync(filePath).toString()
		const document = new Document(rawDocument)
		document.filePath = filePath.toString()
		document.fileStats = fs.statSync(document.filePath)
		return document
	}
	static parserClass = Parser
}

export default Document
