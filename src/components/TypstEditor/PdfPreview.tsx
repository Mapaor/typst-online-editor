'use client'

import { useState } from 'react'
import type { CompileStatus } from '@/lib/typst/TypstCompilerService'
import { usePdfRenderer } from './hooks/usePdfRenderer'
import PdfToolbar from './PdfToolbar'
import PdfCanvas from './PdfCanvas'
import PdfPlaceholder from './PdfPlaceholder'

interface PdfPreviewProps {
	pdfUrl: string | null
	status: CompileStatus
	errorMsg: string | null
	hasCompiled: boolean
	fileCount: number
	charCount: number
	isCollapsed: boolean
	onToggleCollapse: () => void
}

export default function PdfPreview({ pdfUrl, status, errorMsg, hasCompiled, isCollapsed, onToggleCollapse }: PdfPreviewProps) {
	const [zoom, setZoom] = useState(100)
	const [currentPage, setCurrentPage] = useState(1)
	
	const { totalPages, isRendering, canvasRef, containerRef } = usePdfRenderer({
		pdfUrl,
		currentPage,
		zoom,
		isCollapsed
	})
	
	const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
	const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
	const handleZoomFit = () => setZoom(100)
	const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))
	const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
	
	return (
		<div className="h-full flex flex-col bg-gray-800">
			<PdfToolbar
				pdfUrl={pdfUrl}
				currentPage={currentPage}
				totalPages={totalPages}
				zoom={zoom}
				onPrevPage={handlePrevPage}
				onNextPage={handleNextPage}
				onZoomIn={handleZoomIn}
				onZoomOut={handleZoomOut}
				onZoomFit={handleZoomFit}
				isCollapsed={isCollapsed}
				onToggleCollapse={onToggleCollapse}
			/>
			
			{!isCollapsed && (
				<>
					{pdfUrl ? (
						<PdfCanvas
							canvasRef={canvasRef}
							containerRef={containerRef}
							isRendering={isRendering}
						/>
					) : (
						<PdfPlaceholder
							status={status}
							errorMsg={errorMsg}
							hasCompiled={hasCompiled}
						/>
					)}
				</>
			)}
		</div>
	)
}
