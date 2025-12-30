export interface TypstExample {
	id: string
	name: string
	description: string
	filePath: string // Path to .typ file in public folder
	isMultiFile?: boolean
	additionalFiles?: Array<{ path: string; filePath: string }>
}

export const TYPST_EXAMPLES: TypstExample[] = [
	{
		id: 'hello',
		name: 'Hello World',
		description: 'A simple document with headings and text',
		filePath: '/typst-examples/hello-world/main.typ'
	},
	{
		id: 'math',
		name: 'Math Document',
		description: 'Mathematical formulas and equations',
		filePath: '/typst-examples/math-expressions/main.typ'
	},
	{
		id: 'report',
		name: 'Academic Report',
		description: 'A structured document with sections and formatting',
		filePath: '/typst-examples/report/main.typ'
	},
	{
		id: 'mitex',
		name: 'Using a Package',
		description: 'Using Mitex package from the Typst Universe',
		filePath: '/typst-examples/mitex/main.typ'
	},
	{
		id: 'multi-file',
		name: 'Multi-File Document',
		description: 'Document with multiple files, imports, and includes',
		filePath: '/typst-examples/multi-file/main.typ',
		isMultiFile: true,
		additionalFiles: [
			{ path: 'template.typ', filePath: '/typst-examples/multi-file/template.typ' },
			{ path: 'chapters/chapter-1.typ', filePath: '/typst-examples/multi-file/chapters/chapter-1.typ' },
			{ path: 'chapters/chapter-2.typ', filePath: '/typst-examples/multi-file/chapters/chapter-2.typ' },
		]
	}
]

/**
 * Fetches a Typst example file from the public folder
 */
export async function fetchExample(filePath: string): Promise<string> {
	const response = await fetch(filePath)
	if (!response.ok) {
		throw new Error(`Failed to load example: ${response.statusText}`)
	}
	return await response.text()
}

export function getExampleById(id: string): TypstExample | undefined {
	return TYPST_EXAMPLES.find(example => example.id === id)
}

export function getExampleNames(): { id: string; name: string }[] {
	return TYPST_EXAMPLES.map(({ id, name }) => ({ id, name }))
}
