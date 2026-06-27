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
		const a = (await Replicator.fileWalker(this.contentPath))?.filter((file) => file.endsWith(".md"))
		if (!a) throw new Error("A is undefined.")
		const agent = await Replicator.login(this.atprotoAccountHandle, this.atprotoAccountPassword)

		for (const filePath of a) {
			const doc = fs.readFileSync(filePath).toString()
			let frontmatter = {}
			const relative = path.relative(resolvedPath, filePath)
			let textContent = doc.trim()
			try {
				frontmatter = await /** @type {typeof BaseProgram} */ (this.constructor).parserClass.parseYaml(textContent)
				let shouldPublish = false
				determineIfIShouldPublish: {
					if (frontmatter) {
						// FIXME: It doesn't quite work for different kinds of frontmatter. Looks to be ripe for breaking where frontmatter is also not present.
						// Strip frontmatter if it exists.
						const frontmatterDelimiter = "---"
						if (doc.split("---")[2]) {
							const splitDocument = doc.split(frontmatterDelimiter)
							splitDocument.shift()
							splitDocument.shift()
							textContent = splitDocument.join("---")
						}
						if (frontmatter?.publish === false) {
							shouldPublish = false
							break determineIfIShouldPublish
						}
						shouldPublish = true
					}
				}
				if (!shouldPublish) continue
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
	static parserClass = Parser
}

export default BaseProgram
