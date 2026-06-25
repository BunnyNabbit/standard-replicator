/** @todo Yet to be documented. */
export class IndexNow {
	/**@todo Yet to be documented.
	 *
	 * @param {string} key
	 * @param {string} baseUrl
	 */
	constructor(key, baseUrl) {
		this.key = key
		this.host = baseUrl
		/** @type {string[]} */
		this.urls = []
		this.protocol = "https://"
	}
	/**@todo Yet to be documented.
	 *
	 * @param {string} path
	 */
	enqueue(path) {
		this.urls.push(`${this.protocol}${this.host}/${path}`)
	}
	/** @todo Yet to be documented. */
	index() {
		const urls = this.urls
		if (urls.length === 0) return console.log("No new updates found.")
		this.urls = []
		fetch("https://api.indexnow.org/indexnow", {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
			},
			method: "POST",
			body: JSON.stringify({
				host: this.host,
				key: this.key,
				urlList: urls,
			}),
		}).then((response) => {
			console.log(`${this.constructor.name} ${response.status}`)
		})
	}
}

export default IndexNow
