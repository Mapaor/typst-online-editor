'use client'

import { useEffect, useState, useRef } from 'react'
import { createHighlighter, type Highlighter } from 'shiki'

interface CodeEditorProps {
	filePath: string
	content: string
	onChange: (content: string) => void
}

export default function CodeEditor({ filePath, content, onChange }: CodeEditorProps) {
	const [highlightedCode, setHighlightedCode] = useState('')
	const [isInitializing, setIsInitializing] = useState(false)
	const isTypFile = filePath.endsWith('.typ')
	const highlighterRef = useRef<Highlighter | null>(null)

	// Initialize highlighter once
	useEffect(() => {
		if (isTypFile && !highlighterRef.current) {
			setIsInitializing(true)
			const initHighlighter = async () => {
				try {
					const response = await fetch('/textmate-sintax/typst.tmLanguage.json')
					const grammar = await response.json()
					
					highlighterRef.current = await createHighlighter({
						langs: [
							{
								name: 'typst',
								scopeName: 'source.typst',
								...grammar
							}
						],
						themes: ['github-dark']
					})
					
					// Highlight initial content immediately after initialization
					if (content && highlighterRef.current) {
						try {
							const html = highlighterRef.current.codeToHtml(content, {
								lang: 'typst',
								theme: 'github-dark',
							})
							const cleanedHtml = html.replace(/background-color:[^;"]*/g, '')
							setHighlightedCode(cleanedHtml)
						} catch (error) {
							console.error('Syntax highlighting error:', error)
						}
					}
				} catch (error) {
					console.error('Failed to initialize highlighter:', error)
				} finally {
					setIsInitializing(false)
				}
			}
			initHighlighter()
		}
	}, [isTypFile, content])

	// Highlight code immediately
	useEffect(() => {
		if (isTypFile && content && highlighterRef.current) {
			try {
				const html = highlighterRef.current.codeToHtml(content, {
					lang: 'typst',
					theme: 'github-dark',
				})
				// Remove background color from generated HTML
				const cleanedHtml = html.replace(/background-color:[^;"]*/g, '')
				setHighlightedCode(cleanedHtml)
			} catch (error) {
				console.error('Syntax highlighting error:', error)
				setHighlightedCode('')
			}
		}
	}, [content, isTypFile])

	return (
		<div className="flex flex-col h-full border-r border-gray-700">
			<div className="px-4 py-3 bg-gray-800 border-b border-gray-700 text-sm text-gray-400">
				{filePath}
			</div>
			
			<div className="flex-1 overflow-auto">
				{/* Loading indicator */}
				{isTypFile && isInitializing && (
					<div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm z-10">
						Initializing highlighter...
					</div>
				)}
				
				<div className="relative min-h-full">
					{/* Base layer - always present, defines layout */}
					<pre 
						className="p-4 m-0 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
						style={{ 
							tabSize: 4,
							lineHeight: '1.625',
							letterSpacing: '0',
							wordWrap: 'break-word',
							color: 'transparent' // Hidden but still defines layout
						}}
						aria-hidden="true"
					>
						{isTypFile && highlightedCode ? (
							<code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
						) : (
							<code>{content}</code>
						)}
					</pre>
					
					{/* Textarea overlay - always positioned on top */}
					<textarea
						className="absolute inset-0 w-full h-full text-white p-4 m-0 font-mono text-sm resize-none focus:outline-none leading-relaxed whitespace-pre-wrap break-words border-0 cursor-text overflow-hidden"
						style={{ 
							tabSize: 4,
							color: isTypFile && highlightedCode && !isInitializing ? 'transparent' : 'white',
							caretColor: 'white',
							background: 'transparent',
							lineHeight: '1.625',
							letterSpacing: '0',
							WebkitTextFillColor: isTypFile && highlightedCode && !isInitializing ? 'transparent' : 'white',
							wordWrap: 'break-word'
						}}
						value={content}
						onChange={(e) => onChange(e.target.value)}
						placeholder="Type here..."
						spellCheck={false}
					/>
				</div>
			</div>
		</div>
	)
}
