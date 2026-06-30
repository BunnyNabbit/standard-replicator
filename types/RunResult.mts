import { Document } from "../class/Document.mjs"
import { StandardSiteDocumentRecord } from "./StandardSiteDocumentRecord.mjs"
export type RunResult = (Result | ResultWithRecord)[]

export interface Result {
	status: "skipped"
	document: Document
}

export interface ResultWithRecord {
	status: "new" | "updated"
	document: Document
	record: StandardSiteDocumentRecord
	recordKey: string
}
