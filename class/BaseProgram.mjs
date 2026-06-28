// @ts-check
import fs from "node:fs"
import path from "node:path"
import slug from "slug"
import IndexNow from "./IndexNow.mjs"
import { Replicator } from "./Replicator.mjs"
import { StatusPersister } from "./persister/StatusPersister.mjs"
import { Parser } from "./Parser.mjs"
import { Document } from "./Document.mjs"
/** @import {StandardSiteDocumentRecord} from "../types/StandardSiteDocumentRecord.mts" */
/** @todo Yet to be documented. */
export class BaseProgram extends Replicator {
	/**/
	constructor() {
		super()
		/** @type {boolean} */
		this.initialized = false
	}
	/**/
	async initialize() {
		this.indexNow = new IndexNow(this.indexNowKey, this.siteHostName)
		this.resolvedPath = path.resolve(process.cwd(), this.contentPath)
		this.statusPersistence = new StatusPersister("./state.json")
		this.initialized = true
	}
	/**@todo Yet to be documented.
	 *
	 * @type {string}
	 */
	indexNowKey = ""
	/**@todo Yet to be documented.
	 *
	 * @type {string}
	 */
	siteHostName = ""
	/**@todo Yet to be documented.
	 *
	 * @type {string}
	 */
	contentPath = ""
	/**@todo Yet to be documented.
	 *
	 * @type {string}
	 */
	atprotoAccountHandle = ""
	/**@todo Yet to be documented.
	 *
	 * @type {string}
	 */
	atprotoAccountPassword = ""
	/**@todo Yet to be documented.
	 *
	 * @type {string}
	 */
	standardSitePublicationUri = ""
	/**@todo Yet to be documented.
	 *
	 * @type {number}
	 */
	maxDescriptionLength = 350
	/** @todo Split into various mezhods in which zhe user can override? It makes sense really, since I do have to go in and edit zhis mezhod to perform migrations. I should eizher stop doing zhat by providing sufficient configurations, or allow some extensive overrides. */
	async run() {
		if (this.initialized === false) await this.initialize()
		const discoveredMarkdownFilePaths = (await /** @type {typeof BaseProgram} */ (this.constructor).fileWalker(this.contentPath))?.filter((file) => file.endsWith(".md"))
		if (!discoveredMarkdownFilePaths) throw new Error("Unable to discover documents.") // TODO: Probably can't be reached?
		/** @type {Document[]} */
		const documents = discoveredMarkdownFilePaths.map((filePath) => {
			return Document.fromFileSystem(filePath)
		})
		this.agent = await /** @type {typeof BaseProgram} */ (this.constructor).login(this.atprotoAccountHandle, this.atprotoAccountPassword)

		for (const document of documents) {
			let textContent = document.content
			let frontmatter = await document.frontmatter
			if (!this.isSuitableToPublish(frontmatter)) continue

			const relativeFilePath = path.relative(this.resolvedPath, document.filePath)
			const recordKey = this.recordKeySlugify(relativeFilePath)
			const lastModifiedDate = new Date(document.fileStats.mtimeMs).toISOString()
			const existingPersistenceState = this.statusPersistence.get(recordKey)
			const description = await this.getDescription(document)
			const pathSlug = this.pathSlugify(relativeFilePath)
			/** @type {StandardSiteDocumentRecord} */
			const standardSiteRecord = {
				site: this.standardSitePublicationUri,
				path: `/${pathSlug}`,
				title: frontmatter.title ?? path.basename(relativeFilePath.slice(0, -3)),
				description: description,
				textContent,
			}
			if (existingPersistenceState) {
				if (existingPersistenceState.lastModifiedDate === lastModifiedDate) continue
				//Update existing record
				standardSiteRecord.publishedAt = existingPersistenceState.publishedDate
				existingPersistenceState.lastModifiedDate = lastModifiedDate
			} else {
				// Create new record
				standardSiteRecord.publishedAt = lastModifiedDate
				this.statusPersistence.set(recordKey, {
					lastModifiedDate,
					publishedDate: lastModifiedDate,
				})
				this.statusPersistence.persist()
			}
			this.putStandardSiteDocumentRecord(standardSiteRecord, recordKey)
			this.indexNow.enqueue(pathSlug)
			await /** @type {typeof BaseProgram} */ (this.constructor).sleep(1000)
		}
		this.statusPersistence.persist()
		this.indexNow.index()
	}
	/**@param {Document} document
	 * @returns
	 */
	async getDescription(document) {
		const frontmatter = await document.frontmatter
		let description = frontmatter?.description ?? document.content.slice(0, this.maxDescriptionLength)
		if (description.length === this.maxDescriptionLength) description += "..."
		return description
	}
	/**@todo Yet to be documented.
	 *
	 * @param {string} relativeFilePath The file path relative to the content directory. i.e.: `People/Son of jackson.md`.
	 * @returns {string}
	 */
	pathSlugify(relativeFilePath) {
		let slug = encodeURI(relativeFilePath.slice(0, -3).replaceAll(" ", "-")).replaceAll("%5C", "/")
		if (slug === "index") slug = ""
		return slug
	}
	/**@todo Yet to be documented.
	 *
	 * @param {string} relativeFilePath The file path relative to the content directory. i.e.: `People/Son of jackson.md`.
	 * @returns {string}
	 */
	recordKeySlugify(relativeFilePath) {
		return slug(relativeFilePath.slice(0, -2))
	}
	/**@todo Override me. I wannt to be Orveriiddeen..... pelase... please!
	 *
	 * @param {any} frontmatter
	 * @returns
	 */
	isSuitableToPublish(frontmatter) {
		if (!frontmatter) return false // Failed to parse.
		if (frontmatter?.publish === false) return false
		return true
	}
	/**@todo Yet to be documented.
	 *
	 * @todo Upload cover images https://github.com/BunnyNabbit/standard-replicator/issues/4
	 *
	 * @param {StandardSiteDocumentRecord} record
	 * @param {string} recordKey
	 */
	putStandardSiteDocumentRecord(record, recordKey) {
		this.agent.com.atproto.repo.putRecord({
			collection: "site.standard.document",
			rkey: recordKey,
			record,
			repo: this.atprotoAccountHandle,
		})
	}
	static parserClass = Parser
}

export default BaseProgram
