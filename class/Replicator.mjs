// @ts-check
import fs from "node:fs"
import { Agent, CredentialSession } from "@atproto/api"
import path from "node:path"
import { Resolver } from "./Resolver.mjs"
import { fileURLToPath } from "url"
import { JSDOM } from "jsdom"
/** @todo Yet to be documented. */
export class Replicator {
	/**Explores recursively a directory and returns all the file paths and folder paths.
	 *
	 * @param {String} dir - The directory to explore
	 * @param {Number} [limit] - The maximum depth to explore
	 * @returns {Promise<string[]?>} - A promise that resolves to an array of file paths and folder paths
	 * @see http://stackoverflow.com/a/5827895/4241030
	 */
	static async fileWalker(dir, limit = Infinity) {
		if (limit && limit <= 0) return []
		/** @type {any[] | PromiseLike<string[]>} */
		let results = []
		const list = await fs.promises.readdir(dir)
		let pending = list.length

		if (!pending) return results

		for (let file of list) {
			file = path.resolve(dir, file)
			const stat = await fs.promises.stat(file)
			// If directory, execute a recursive call
			if (stat && stat.isDirectory()) {
				const res = await Replicator.fileWalker(file, limit - 1)
				results = results.concat(res)
				if (!--pending) return results
			} else {
				results.push(file)
				if (!--pending) return results
			}
		}
		return null
	}
	/**@todo Stop wizh zhis nonsense!
	 *
	 * @param {string} str
	 */
	static dumbParseYaml(str) {
		let output = ""
		if (str.includes("tags: journal")) {
			let newString = ""
			str.split("\n").forEach((line) => {
				if (line.includes("tags:") || line.includes("date:")) return
				newString += line + "\n"
			})
			str = newString
		}
		str.split("\n").forEach((line) => {
			if (line.trim().length === 0) return // skip empty lines
			if (line.startsWith("#")) return // skip comments
			if (line.includes(":")) {
				let [key, value] = line.split(":").map((part) => part.trim())
				output += `"${key}": ${value},\n`
			}
		})
		return JSON.parse(`{\n${output.trim().slice(0, -1)}\n}`) // remove the last comma and wrap in braces
	}
	/**@todo Stop wizh zhis nonsense! Find a proper parser.
	 *
	 * @param {string} str
	 * @returns {any | false}
	 */
	static extractFrontmatter(str) {
		try {
			if (str.startsWith("---")) return Replicator.dumbParseYaml(str.split("---")[1].trim())
		} catch (error) {
			return { error: true }
		}
		return false
	}
	/**@param {string} handle
	 * @param {string} password
	 */
	static async login(handle, password) {
		const actorHandle = handle
		const actorPassword = password

		const session = new CredentialSession(new URL(await Resolver.resolveServiceFromHandle(actorHandle)))

		await session.login({
			identifier: actorHandle,
			password: actorPassword,
		})

		const agent = new Agent(session)
		return agent
	}
	/** @param {number} time */
	static sleep(time) {
		return new Promise((resolve) => {
			setTimeout(resolve, time)
		})
	}
	/** @param {string | URL | Request} pageUrl */
	static fetchCover(pageUrl) {
		fetch(pageUrl).then(async (response) => {
			const html = await response.text()
			const parsedDocumentObjectModel = new JSDOM(html)
			const openGraphImageProperty = parsedDocumentObjectModel.window.document.querySelector('meta[property="og:image"]')
			if (openGraphImageProperty) {
				const coverUrl = openGraphImageProperty.getAttribute("content")
				console.log(coverUrl)
			}
		})
	}
}

export default Replicator

if (fileURLToPath(import.meta.url) === process.argv[1]) {
	// @ts-ignore it might be missing or unused.
	import("./Program.mjs")
		.then((module) => {
			const Program = module.default
			new Program().run()
		})
		.catch((error) => {
			console.error("")
		})
}
