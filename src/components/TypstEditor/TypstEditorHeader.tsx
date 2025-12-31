'use client'

import { Loader2, CheckCircle2, XCircle, Check, Zap, FileText, ChevronDown, Github } from 'lucide-react'
import type { CompileStatus } from '@/lib/typst/TypstCompilerService'
import { TYPST_EXAMPLES } from '@/lib/typst/examples/TypstExamples'

interface TypstEditorHeaderProps {
	status: CompileStatus
	hasCompiled: boolean
	pdfUrl: string | null
	showExamples: boolean
	isMobile: boolean
	onToggleExamples: () => void
	onCompileNow: () => void
	onDownload: () => void
	onLoadExample: (exampleId: string) => void
}

export default function TypstEditorHeader({
	status,
	hasCompiled,
	pdfUrl,
	showExamples,
	isMobile,
	onToggleExamples,
	onCompileNow,
	onDownload,
	onLoadExample,
}: TypstEditorHeaderProps) {
	const getStatusText = (): React.ReactNode => {
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
		<div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700">
			<div className="flex items-center gap-4">
				<h1 className="text-xl font-semibold">Typst Online Editor</h1>
				<div className="relative">
					<button
						className={`flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 ${isMobile ? 'text-xs' : ''}`}
						onClick={onToggleExamples}
					>
						<FileText className="w-4 h-4" />
						Load Example
						<ChevronDown className="w-4 h-4" />
					</button>
					{showExamples && (
						<div className="absolute top-full left-0 mt-1 w-lg max-h-114 overflow-y-auto bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
							<div className="grid grid-cols-2">
								{TYPST_EXAMPLES.map((example) => (
									<button
										key={example.id}
										className="w-full text-left px-4 py-3 hover:bg-gray-700 border-b border-gray-700 border-r last:border-r-0 odd:border-r"
										onClick={() => onLoadExample(example.id)}
									>
										<div className="font-medium">{example.name}</div>
										<div className="text-sm text-gray-400">{example.description}</div>
									</button>
								))}
							</div>
						</div>
					)}
				</div>
				<a
					href="https://github.com/Mapaor/typst-online-editor"
					target="_blank"
					rel="noopener noreferrer"
					className="p-2 text-white rounded hover:bg-gray-600 transition-transform duration-200"
					title="View on GitHub"
				>
					<Github className="w-5 h-5" />
				</a>
			</div>
			<div className="flex items-center gap-4">
				<div className="text-sm">
					{getStatusText()}
				</div>
				<button
					className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'text-xs' : ''}`}
					onClick={onCompileNow}
					disabled={status === 'compiling'}
				>
					Compile Now
				</button>
				{pdfUrl && (
					<button
						className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${isMobile ? 'text-xs' : ''}`}
						onClick={onDownload}
					>
						Download PDF
					</button>
				)}
			</div>
		</div>
	)
}
