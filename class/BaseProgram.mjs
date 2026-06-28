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
export class BaseProgram {
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
	/** @todo Split into various mezhods in which zhe user can override? It makes sense really, since I do have to go in and edit zhis mezhod to perform migrations. I should eizher stop doing zhat by providing sufficient configurations, or allow some extensive overrides. */
	async run() {
		const indexNow = new IndexNow(this.indexNowKey, this.siteHostName)
		const resolvedPath = path.resolve(process.cwd(), this.contentPath)
		const statusPersistence = new StatusPersister("./state.json")
		const discoveredMarkdownFilePaths = (await Replicator.fileWalker(this.contentPath))?.filter((file) => file.endsWith(".md"))
		if (!discoveredMarkdownFilePaths) throw new Error("Unable to discover documents.") // TODO: Probably can't be reached?
		/** @type {Document[]} */
		const documents = discoveredMarkdownFilePaths.map((file) => {
			return Document.fromFileSystem(file)
		})
		this.agent = await Replicator.login(this.atprotoAccountHandle, this.atprotoAccountPassword)

		for (const document of documents) {
			let textContent = document.content
			let frontmatter = await document.frontmatter
			if (!this.isSuitableToPublish(frontmatter)) continue

			const relative = path.relative(resolvedPath, document.filePath)
			const maxDescriptionLength = 350
			/** @type {string} */
			const recordKey = slug(relative.slice(0, -2))
			const fileStats = document.fileStats
			const lastModifiedDate = new Date(fileStats.mtimeMs).toISOString()
			const existingPersistenceState = statusPersistence.get(recordKey)
			const title = frontmatter.title ?? path.basename(relative.slice(0, -3))
			let description = frontmatter.description ?? textContent.slice(0, maxDescriptionLength)
			if (description.length === maxDescriptionLength) description += "..."
			let quartzPath = encodeURI(relative.slice(0, -3).replaceAll(" ", "-")).replaceAll("%5C", "/")
			if (quartzPath === "index") quartzPath = ""
			/** @type {StandardSiteDocumentRecord} */
			const standardSiteRecord = {
				site: this.standardSitePublicationUri,
				path: `/${quartzPath}`,
				title,
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
				statusPersistence.set(recordKey, {
					lastModifiedDate,
					publishedDate: lastModifiedDate,
				})
				statusPersistence.persist()
			}
			this.putStandardSiteDocumentRecord(standardSiteRecord, recordKey)
			indexNow.enqueue(quartzPath)
			await Replicator.sleep(1000)
		}
		statusPersistence.persist()
		indexNow.index()
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
