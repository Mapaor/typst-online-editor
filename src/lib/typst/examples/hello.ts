import type { TypstExample } from './TypstExamples'

export const helloExample: TypstExample = {
	id: 'hello',
	name: 'Hello World',
	description: 'A simple document with headings and text',
	code: `= Hello Typst

This is a simple document to get you started.

== Introduction

Typst is a modern markup-based typesetting system that is designed to be as powerful as LaTeX while being much easier to learn and use.

== Features

- Fast compilation
- Clean syntax
- Built-in math support
- Modern tooling

== Getting Started

Just start typing! The preview will update automatically.

#emph[This text is emphasized] and #strong[this text is bold].

You can also use _underscores_ for emphasis and *asterisks* for bold.`
}
