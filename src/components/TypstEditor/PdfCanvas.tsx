import { Loader2 } from 'lucide-react'
import type { RefObject, MutableRefObject } from 'react'
import type { RenderTask } from 'pdfjs-dist'

interface CanvasInfo {
	canvas: HTMLCanvasElement
	renderTask: RenderTask | null
}

interface PdfCanvasProps {
	canvasRefs: MutableRefObject<Map<number, CanvasInfo>>
	pageRefs: MutableRefObject<Map<number, HTMLDivElement>>
	textLayerRefs: MutableRefObject<Map<number, HTMLDivElement>>
	containerRef: RefObject<HTMLDivElement | null>
	isRendering: boolean
	totalPages: number
}

export default function PdfCanvas({ canvasRefs, pageRefs, textLayerRefs, containerRef, isRendering, totalPages }: PdfCanvasProps) {
	return (
		<div className="preview-container relative flex-1 bg-gray-100">
			{isRendering && (
				<div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
					<Loader2 className="w-8 h-8 animate-spin text-gray-600" />
				</div>
			)}
			<div 
				ref={containerRef}
				className="pdfjs-container absolute inset-0 overflow-auto p-6"
			>
				<div className="pdfViewer">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
						<div
							key={pageNum}
							ref={(el) => {
								if (el) {
									pageRefs.current.set(pageNum, el)
								}
							}}
							className="page mx-auto my-4 first:mt-0"
							style={{
								boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
							}}
						>
							<div className="canvasWrapper bg-white relative">
								<canvas
									ref={(el) => {
										if (el) {
											canvasRefs.current.set(pageNum, { canvas: el, renderTask: null })
										}
									}}
									className="block"
									role="presentation"
								/>
								<div
									ref={(el) => {
										if (el) {
											textLayerRefs.current.set(pageNum, el)
										}
									}}
									className="textLayer"
								/>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
