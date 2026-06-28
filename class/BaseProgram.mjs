// @ts-check
import fs from "node:fs"
import path from "node:path"
import slug from "slug"
import IndexNow from "./IndexNow.mjs"
import { Replicator } from "./Replicator.mjs"
import { StatusPersister } from "./persister/StatusPersister.mjs"
import { Parser } from "./Parser.mjs"
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
		if (!discoveredMarkdownFilePaths) throw new Error("A is undefined.")
		this.agent = await Replicator.login(this.atprotoAccountHandle, this.atprotoAccountPassword)

		for (const filePath of discoveredMarkdownFilePaths) {
			const rawDocument = fs.readFileSync(filePath).toString()
			let frontmatter = {}
			const relative = path.relative(resolvedPath, filePath)
			let textContent = rawDocument.trim()
			try {
				frontmatter = await /** @type {typeof BaseProgram} */ (this.constructor).parserClass.parseYaml(textContent)
				if (frontmatter) {
					// FIXME: It doesn't quite work for different kinds of frontmatter. Looks to be ripe for breaking where frontmatter is also not present.
					// Strip frontmatter if it exists.
					const frontmatterDelimiter = "---"
					if (rawDocument.split("---")[2]) {
						const splitDocument = rawDocument.split(frontmatterDelimiter)
						splitDocument.shift()
						splitDocument.shift()
						textContent = splitDocument.join("---")
					}
					if (this.isSuitableToPublish(frontmatter)) continue
				}
			} catch (error) {
				console.warn("Failed to parse frontmatter.", error)
				continue
			}

			const maxDescriptionLength = 350
			const recordKey = slug(relative.slice(0, -2))
			const statResult = fs.statSync(filePath)
			const lastModifiedDate = new Date(statResult.mtimeMs).toISOString()
			const existingPersistenceState = statusPersistence.get(recordKey)
			const title = frontmatter.title ?? path.basename(relative.slice(0, -3))
			let description = frontmatter.description ?? textContent.slice(0, maxDescriptionLength)
			if (description.length === maxDescriptionLength) description += "..."
			let quartzPath = encodeURI(relative.slice(0, -3).replaceAll(" ", "-")).replaceAll("%5C", "/")
			if (quartzPath === "index") quartzPath = ""
			/** @type {string} */
			let publishedAtDate
			if (existingPersistenceState) {
				if (existingPersistenceState.lastModifiedDate === lastModifiedDate) continue
				//Update existing record
				this.putStandardSiteDocumentRecord(recordKey, quartzPath, title, description, textContent, existingPersistenceState.publishedDate)
				publishedAtDate = existingPersistenceState.publishedDate
				existingPersistenceState.lastModifiedDate = lastModifiedDate
			} else {
				// Create new record
				publishedAtDate = lastModifiedDate
				statusPersistence.set(recordKey, {
					lastModifiedDate,
					publishedDate: lastModifiedDate,
				})
				statusPersistence.persist()
			}
			this.putStandardSiteDocumentRecord(recordKey, quartzPath, title, description, textContent, publishedAtDate)
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
		if (frontmatter?.publish === false) return false
		return true
	}
	/**@todo Yet to be documented.
	 *
	 * @todo Upload cover images https://github.com/BunnyNabbit/standard-replicator/issues/4
	 *
	 * @param {any} recordKey
	 * @param {string} quartzPath
	 * @param {any} title
	 * @param {any} description
	 * @param {string} textContent
	 * @param {string} publishedAtDate
	 */
	putStandardSiteDocumentRecord(recordKey, quartzPath, title, description, textContent, publishedAtDate) {
		this.agent.com.atproto.repo.putRecord({
			collection: "site.standard.document",
			rkey: recordKey,
			record: {
				site: this.standardSitePublicationUri,
				path: "/" + quartzPath,
				title: title,
				description: description,
				// coverImage: {
				// 	$type: "blob",
				// 	ref: {
				// 		$link: "bafkreiexample123456789",
				// 	},
				// 	mimeType: "image/jpeg",
				// 	size: 245678,
				// },
				textContent: textContent,
				// tags: ["tutorial", "atproto"],
				publishedAt: publishedAtDate,
			},
			repo: this.atprotoAccountHandle,
		})
	}
	static parserClass = Parser
}

export default BaseProgram
