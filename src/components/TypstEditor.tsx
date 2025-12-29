'use client'

import { useState, useEffect, useRef } from 'react'
import { TypstCompilerService, type CompileStatus } from '@/lib/typst/TypstCompilerService'
import { debounce, downloadPdfFromUrl } from '@/lib/utils/helpers'

export default function TypstEditor() {
	const [typstCode, setTypstCode] = useState(`= Hello Typst

This is a test.`)
	const [status, setStatus] = useState<CompileStatus>('idle')
	const [pdfUrl, setPdfUrl] = useState<string | null>(null)
	const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
			},
			onError: (error) => {
				setErrorMsg(error)
				setPdfUrl(null)
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

	return (
		<div className="flex flex-col h-screen bg-gray-900 text-white">
			<div className="flex justify-between items-center px-4 py-3 bg-gray-800 border-b border-gray-700">
				<h1 className="text-xl font-semibold">Typst Online Editor</h1>
				<div className="flex items-center gap-4">
					<div className="text-sm">
						{status === 'compiling' && '⏳ Compiling...'}
						{status === 'done' && '✅ Ready'}
						{status === 'error' && '❌ Error'}
						{status === 'idle' && 'Ready'}
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
							{status === 'compiling' && <p className="text-lg">⏳ Compiling...</p>}
							{status === 'error' && (
								<>
									<p className="text-lg text-red-500">❌ Error</p>
									<pre className="mt-2 text-sm text-left max-w-2xl overflow-auto p-4 bg-gray-900 rounded">
										{errorMsg}
									</pre>
								</>
							)}
							{status === 'idle' && (
								<p className="text-lg">Click &quot;Compile Now&quot; to generate PDF</p>
							)}
							<p className="mt-4 text-sm">Code: {typstCode.length} chars</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
