'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle2, XCircle, Check, Zap, FileText, ChevronDown } from 'lucide-react'
import { TypstCompilerService, type CompileStatus } from '@/lib/typst/TypstCompilerService'
import { debounce, downloadPdfFromUrl } from '@/lib/utils/helpers'
import { TYPST_EXAMPLES } from '@/lib/typst/examples/TypstExamples'

export default function TypstEditor() {
	const [typstCode, setTypstCode] = useState(`= Hello Typst

This is a test.`)
	const [status, setStatus] = useState<CompileStatus>('idle')
	const [pdfUrl, setPdfUrl] = useState<string | null>(null)
	const [errorMsg, setErrorMsg] = useState<string | null>(null)
	const [hasCompiled, setHasCompiled] = useState(false)
	const [showExamples, setShowExamples] = useState(false)

	const compilerServiceRef = useRef<TypstCompilerService | null>(null)
	const debouncedCompileRef = useRef<((code: string) => void) & { cancel: () => void } | null>(null)

	useEffect(() => {
		// Initialize compiler service
		const compilerService = new TypstCompilerService()
		compilerServiceRef.current = compilerService

		// Listen to compile events
		const unsubscribe = compilerService.addListener({
			onStatusChange: (newStatus) => {
				setStatus(newStatus)
			},
			onSuccess: (pdf, url) => {
				setPdfUrl(url)
				setErrorMsg(null)
				setHasCompiled(true)
			},
			onError: (error) => {
				setErrorMsg(error)
				setPdfUrl(null)
				setHasCompiled(true)
			},
		})

		// Create debounced compile function
		debouncedCompileRef.current = debounce((code: string) => {
			if (compilerServiceRef.current) {
				void compilerServiceRef.current.compile(code)
			}
		}, 1000)

		return () => {
			debouncedCompileRef.current?.cancel()
			unsubscribe()
			compilerService.dispose()
		}
	}, [])

	// Watch for code changes and trigger debounced compile
	useEffect(() => {
		if (debouncedCompileRef.current && compilerServiceRef.current) {
			debouncedCompileRef.current(typstCode)
		}
	}, [typstCode])

	async function handleCompileNow() {
		if (compilerServiceRef.current) {
			await compilerServiceRef.current.compile(typstCode)
		}
	}

	function handleDownload() {
		if (pdfUrl) {
			downloadPdfFromUrl(pdfUrl, 'document.pdf')
		}
	}

	function loadExample(exampleId: string) {
		const example = TYPST_EXAMPLES.find(ex => ex.id === exampleId)
		if (example) {
			setTypstCode(example.code)
			setShowExamples(false)
		}
	}

	// Get status text based on current state
	function getStatusText(): React.ReactNode {
		switch (status) {
			case 'compiling':
				return (
					<span className="flex items-center gap-2">
						<Loader2 className="w-4 h-4 animate-spin" />
						{hasCompiled ? 'Compiling...' : 'Initializing compiler...'}
					</span>
				)
			case 'done':
				return (
					<span className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-green-500" />
						Compiled
					</span>
				)
			case 'error':
				return (
					<span className="flex items-center gap-2">
						<XCircle className="w-4 h-4 text-red-500" />
						Error
					</span>
				)
			case 'idle':
				return hasCompiled ? (
					<span className="flex items-center gap-2">
						<Check className="w-4 h-4 text-green-500" />
						Ready
					</span>
				) : (
					<span className="flex items-center gap-2">
						<Zap className="w-4 h-4 text-blue-500" />
						Ready to compile
					</span>
				)
			default:
				return 'Ready'
		}
	}

	return (
		<div className="flex flex-col h-screen bg-gray-900 text-white">
			<div className="flex justify-between items-center px-4 py-3 bg-gray-800 border-b border-gray-700">
				<div className="flex items-center gap-4">
					<h1 className="text-xl font-semibold">Typst Online Editor</h1>
					<div className="relative">
						<button
							className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
							onClick={() => setShowExamples(!showExamples)}
						>
							<FileText className="w-4 h-4" />
							Load Example
							<ChevronDown className="w-4 h-4" />
						</button>
						{showExamples && (
							<div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
								{TYPST_EXAMPLES.map((example) => (
									<button
										key={example.id}
										className="w-full text-left px-4 py-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
										onClick={() => loadExample(example.id)}
									>
										<div className="font-medium">{example.name}</div>
										<div className="text-sm text-gray-400">{example.description}</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
				<div className="flex items-center gap-4">
					<div className="text-sm">
						{getStatusText()}
					</div>
					<button
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={handleCompileNow}
						disabled={status === 'compiling'}
					>
						Compile Now
					</button>
					{pdfUrl && (
						<button
							className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
							onClick={handleDownload}
						>
							Download PDF
						</button>
					)}
				</div>
			</div>

			<div className="flex flex-1 overflow-hidden">
				<div className="flex-1 flex flex-col border-r border-gray-700">
					<textarea
						className="flex-1 bg-gray-900 text-white p-4 font-mono text-sm resize-none focus:outline-none"
						value={typstCode}
						onChange={(e) => setTypstCode(e.target.value)}
						placeholder="Type Typst code here..."
					/>
				</div>

				<div className="flex-1 flex items-center justify-center bg-gray-800">
					{pdfUrl ? (
						<iframe
							src={pdfUrl}
							title="PDF Preview"
							className="w-full h-full border-0"
						/>
					) : (
						<div className="text-center text-gray-400">
							{status === 'compiling' && (
								<p className="text-lg flex items-center justify-center gap-2">
									<Loader2 className="w-5 h-5 animate-spin" />
								{hasCompiled ? 'Compiling...' : 'Initializing compiler...'}
								</p>
							)}
							{status === 'error' && (
								<>
									<p className="text-lg text-red-500 flex items-center justify-center gap-2">
										<XCircle className="w-5 h-5" />
										Error
									</p>
									<pre className="mt-2 text-sm text-left max-w-2xl overflow-auto p-4 bg-gray-900 rounded">
										{errorMsg}
									</pre>
								</>
							)}
							{status === 'idle' && (
								<p className="text-lg">
								{hasCompiled 
										? 'Type to edit and compile' 
										: 'Click "Compile Now" or start typing to generate PDF'}
								</p>
							)}
							{status === 'done' && (
								<p className="text-lg text-gray-400">Compilation complete</p>
							)}
							<p className="mt-4 text-sm">Code: {typstCode.length} chars</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
