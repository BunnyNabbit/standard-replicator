// @ts-check
import { DidResolver, HandleResolver } from "@atproto/identity"
/** @import {DidDocument} from "@atproto/identity" */

/** @todo Yet to be documented. */
export class Resolver {
	/**@todo Yet to be documented.
	 *
	 * @param {string} handle - The account's handle.
	 * @returns {Promise<DidDocument | null>} The DID document.
	 * @throws {Error} If I am unable to find the specified {@link handle}'s DID document.
	 */
	static async resolveDidDocumentFromHandle(handle) {
		const did = await Resolver.#handleResolver.resolve(handle)
		if (!did) throw new Error("Unable to resolve handle.")
		const document = await Resolver.#didResolver.resolve(did)
		return document
	}
	/**@todo Yet to be documented.
	 *
	 * @param {string} handle - The account's handle.
	 * @returns {Promise<string>} The account's service endpoint.
	 * @throws {Error} If I am unable to find the specified {@link handle}'s PDS.
	 */
	static async resolveServiceFromHandle(handle) {
		const document = await Resolver.resolveDidDocumentFromHandle(handle)
		if (!(document && document.service)) throw new Error("DID document does not specify services.")
		const service = document.service.find((service) => service.id == "#atproto_pds")
		if (!service) throw new Error("DID document does not specify a personal data server.")
		if (typeof service.serviceEndpoint !== "string") throw new Error("Service endpoint not found in document.")
		return service.serviceEndpoint
	}
	static #didResolver = new DidResolver({})
	static #handleResolver = new HandleResolver({})
}

export default Resolver
