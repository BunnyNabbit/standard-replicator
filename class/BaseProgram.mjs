// @ts-check
import fs from "node:fs"
import path from "node:path"
import slug from "slug"
import IndexNow from "./IndexNow.mjs"
import { Replicator } from "./Replicator.mjs"
import { StatusPersister } from "./persister/StatusPersister.mjs"
import { JSDOM } from "jsdom"
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
		const a = (await Replicator.fileWalker(this.contentPath))?.filter((file) => file.endsWith(".md"))
		if (!a) throw new Error("A is undefined.")
		const agent = await Replicator.login(this.atprotoAccountHandle, this.atprotoAccountPassword)

		for (const filePath of a) {
			const doc = fs.readFileSync(filePath).toString()
			let frontmatter = Replicator.extractFrontmatter(doc)
			const relative = path.relative(resolvedPath, filePath)
			let textContent = doc.trim()
			let shouldPublish = false
			determineIfIShouldPublish: {
				if (frontmatter) {
					textContent = doc.split("---")[2].trim()
					if (frontmatter.error || frontmatter.publish === false) {
						shouldPublish = false
						break determineIfIShouldPublish
					}
					shouldPublish = true
				}
			}
			if (!shouldPublish) continue

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
			if (existingPersistenceState) {
				if (existingPersistenceState.lastModifiedDate === lastModifiedDate) continue
				// if (quartzPath === encodeURI(relative.slice(0, -3)).replaceAll("%5C", "/")) continue
				//Update existing record
				agent.com.atproto.repo.putRecord({
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
						publishedAt: existingPersistenceState.publishedDate,
					},
					repo: this.atprotoAccountHandle,
				})
				existingPersistenceState.lastModifiedDate = lastModifiedDate
				// let indexPath = quartzPath
				indexNow.enqueue(quartzPath)
				await Replicator.sleep(1000)
			} else {
				// Create new record
				agent.com.atproto.repo.putRecord({
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
						publishedAt: lastModifiedDate,
					},
					repo: this.atprotoAccountHandle,
				})
				indexNow.enqueue(quartzPath)
				statusPersistence.set(recordKey, {
					lastModifiedDate,
					publishedDate: lastModifiedDate,
				})
				statusPersistence.persist()
				await Replicator.sleep(1000)
			}
		}
		statusPersistence.persist()
		indexNow.index()
	}
}

export default BaseProgram
