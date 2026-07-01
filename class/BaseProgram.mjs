// @ts-check
import path from "node:path"
import slug from "slug"
import IndexNow from "./IndexNow.mjs"
import { Replicator } from "./Replicator.mjs"
import { StatusPersister } from "./persister/StatusPersister.mjs"
import { Parser } from "./Parser.mjs"
import { Document } from "./Document.mjs"
/** @import {StandardSiteDocumentRecord} from "../types/StandardSiteDocumentRecord.mts" */
/**@import {
 *   Result,
 *   ResultWithRecord,
 *   RunResult
 * } from "../types/RunResult.mts"
 */
/** @todo Yet to be documented. */
export class BaseProgram extends Replicator {
	/**/
	constructor() {
		super()
		/** @type {boolean} */
		this.initialized = false
	}
	/** @todo Yet to be documented. */
	async initialize() {
		this.indexNow = new /** @type {typeof BaseProgram} */ (this.constructor).indexNowClass(this.indexNowKey, this.siteHostName)
		this.resolvedPath = path.resolve(process.cwd(), this.contentPath)
		this.statusPersistence = new /** @type {typeof BaseProgram} */ (this.constructor).statusPersisterClass("./state.json")
		this.initialized = true
	}
	/**The _IndexNow_ key for requesting search engines to crawl pages.
	 *
	 * @type {string}
	 */
	indexNowKey = ""
	/**The site hostname to associate the documents with.
	 *
	 * @type {string}
	 */
	siteHostName = ""
	/**The directory path to the collection of markdown documents.
	 *
	 * @type {string}
	 */
	contentPath = ""
	/**The AT Protocol account handle.
	 *
	 * @type {string}
	 */
	atprotoAccountHandle = ""
	/**The AT Protocol account password.
	 *
	 * @type {string}
	 */
	atprotoAccountPassword = ""
	/**The URI of the publication to associate documents with.
	 *
	 * @type {string}
	 */
	standardSitePublicationUri = ""
	/**The maximum length in character of the description.
	 *
	 * @type {number}
	 */
	maxDescriptionLength = 350
	/**@todo Yet to be documented.
	 *
	 * @returns {Promise<RunResult>}
	 */
	async run() {
		if (this.initialized === false) await this.initialize()
		/** @type {RunResult} */
		const runResults = []
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
			if (!this.isSuitableToPublish(frontmatter)) {
				runResults.push({
					status: "skipped",
					document,
				})
				continue
			}

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
			/** @type {Result | ResultWithRecord} */
			let runResult
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
				runResult = {
					status: "new",
					document,
					record: standardSiteRecord,
					recordKey,
				}
			}
			// TODO: it's probably not a safe assumption to use https://
			const coverArrayBuffer = await /** @type {typeof Replicator} */ (this.constructor).fetchCover(`https://${this.siteHostName}/${pathSlug}`)
			if (coverArrayBuffer) {
				await this.uploadBlob(coverArrayBuffer)
					.then((coverBlob) => {
						standardSiteRecord.coverImage = coverBlob
					})
					.catch((error) => {
						console.warn(`Failed while uploading blob to ${recordKey}.`, error)
					})
			}
			this.putStandardSiteDocumentRecord(standardSiteRecord, recordKey)
			this.indexNow.enqueue(pathSlug)
			runResult = {
				status: "updated",
				document,
				record: standardSiteRecord,
				recordKey,
			}
			runResults.push(runResult)
			await /** @type {typeof BaseProgram} */ (this.constructor).sleep(1000)
		}
		this.statusPersistence.persist()
		this.indexNow.index()
		return runResults
	}
	/**@todo Yet to be documented.
	 *
	 * @param {Document} document
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
	/**Determines if the provided frontmatter is to publish the document.
	 *
	 * @param {any} frontmatter
	 * @returns
	 */
	isSuitableToPublish(frontmatter) {
		if (!frontmatter) return false // Failed to parse.
		if (frontmatter?.publish === false) return false
		return true
	}
	/**Updates or creates the {@link record|standard.site document} to the account's personal data server.
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
	/** Uploads a binary large object to the account's personal data server. */
	async uploadBlob(data) {
		const blob = (await this.agent.uploadBlob(data)).data.blob
		return blob
	}
	static parserClass = Parser
	static indexNowClass = IndexNow
	static statusPersisterClass = StatusPersister
}

export default BaseProgram
