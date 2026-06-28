/** @todo Yet to be documented. */
export interface StandardSiteDocumentRecord {
	site: string
	path: string
	title: string
	description: string
	coverImage?: {
		$type: "blob"
		ref: {
			$link: string
		}
		mimeType: string
		size: number
	}
	textContent: string
	tags?: string[]
	publishedAt?: string
	[x: string]: unknown
}
