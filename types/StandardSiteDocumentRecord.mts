import { BlobRef } from "@atproto/api"

/** @todo Yet to be documented. */
export interface StandardSiteDocumentRecord {
	site: string
	path: string
	title: string
	description: string
	coverImage?: BlobRef
	textContent: string
	tags?: string[]
	publishedAt?: string
	[x: string]: unknown
}
