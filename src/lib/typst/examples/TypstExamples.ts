import { helloExample } from './hello'
import { mathExample } from './math'
import { reportExample } from './report'

export interface TypstExample {
	id: string
	name: string
	description: string
	code: string
}

export const TYPST_EXAMPLES: TypstExample[] = [
	helloExample,
	mathExample,
	reportExample
]

export function getExampleById(id: string): TypstExample | undefined {
	return TYPST_EXAMPLES.find(example => example.id === id)
}

export function getExampleNames(): { id: string; name: string }[] {
	return TYPST_EXAMPLES.map(({ id, name }) => ({ id, name }))
}
