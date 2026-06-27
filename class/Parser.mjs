// @ts-check
import remarkFrontmatter from "remark-frontmatter"
import remarkStringify from "remark-stringify"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { matter } from "vfile-matter"

/** @todo Yet to be documented. */
export class Parser {
	/**@todo Yet to be documented.
	 *
	 * @param {string} string
	 */
	static async parseYaml(string) {
		const file = await unified()
			.use(remarkParse)
			.use(remarkStringify)
			.use(remarkFrontmatter)
			.use(function () {
				return function (tree, file) {
					matter(file, { strip: true })
				}
			})
			.process(string)
		return file.data.matter
	}
}

export default Parser
