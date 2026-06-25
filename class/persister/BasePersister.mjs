// @ts-check
import fs from "node:fs"
/** @import {Status} from "../../types/Status.mjs" */

/**@todo Yet to be documented.
 *
 * @template Value
 */
export class BasePersister {
	/** @param {string} path */
	constructor(path) {
		this.file = path
		/** @type {Record<string, Value>} */
		this.record = {}
		this.restoreRecord()
	}
	/**@param {string} key
	 * @param {Value} value
	 */
	set(key, value) {
		this.record[key] = value
	}
	/**@param {string} key
	 * @returns {Value | null}
	 */
	get(key) {
		return this.record[key] ?? null
	}

	restoreRecord() {
		this.record = JSON.parse(fs.readFileSync(this.file).toString())
	}

	persist() {
		fs.writeFileSync(this.file, JSON.stringify(this.record))
	}
}

export default BasePersister
