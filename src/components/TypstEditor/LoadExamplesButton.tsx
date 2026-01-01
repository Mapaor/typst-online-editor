'use client'

import { FileText, ChevronDown } from 'lucide-react'
import { TYPST_EXAMPLES } from '@/lib/typst/examples/TypstExamples'

interface LoadExamplesButtonProps {
	isMobile: boolean
	showExamples: boolean
	onToggleExamples: () => void
	onLoadExample: (exampleId: string) => void
}

export default function LoadExamplesButton({
	isMobile,
	showExamples,
	onToggleExamples,
	onLoadExample,
}: LoadExamplesButtonProps) {
	return (
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
				<div className={`absolute top-full left-0 mt-1 ${isMobile ? 'w-64' : 'w-lg'} max-h-114 overflow-y-auto bg-gray-800 border border-gray-700 rounded shadow-lg z-50`}>
					<div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
						{TYPST_EXAMPLES.map((example) => (
							<button
								key={example.id}
								className={`w-full text-left ${isMobile ? 'px-2 py-2' : 'px-4 py-3'} hover:bg-gray-700 border-b border-gray-700 border-r last:border-r-0 odd:border-r`}
								onClick={() => onLoadExample(example.id)}
							>
								<div className={`font-medium ${isMobile ? 'text-xs' : ''}`}>{example.name}</div>
								<div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>{example.description}</div>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
