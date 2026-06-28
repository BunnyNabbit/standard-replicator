/** I batch out calls to _IndexNow_. */
export class IndexNow {
	/**Creates a new instance of {@link IndexNow}.
	 *
	 * @param {string} key - The IndexNow key.
	 * @param {string} baseUrl
	 */
	constructor(key, baseUrl) {
		this.key = key
		this.host = baseUrl
		/** @type {string[]} */
		this.urls = []
		this.protocol = "https://"
	}
	/**Adds a {@link path|URL} to the array of {@link urls|URLs}.
	 *
	 * @param {string} path
	 */
	enqueue(path) {
		this.urls.push(`${this.protocol}${this.host}/${path}`)
	}
	/** Requests {@link urls} to be indexed by search engines. {@link urls} gets replaced with an empty array when this method is called. */
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
