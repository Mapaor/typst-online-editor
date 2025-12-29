import { useState, useEffect, useRef } from 'react'
import { getPdfjs } from '@/lib/pdf/pdfjs'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface UsePdfRendererProps {
	pdfUrl: string | null
	currentPage: number
	zoom: number
	isCollapsed: boolean
}

export function usePdfRenderer({ pdfUrl, currentPage, zoom, isCollapsed }: UsePdfRendererProps) {
	const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
	const [totalPages, setTotalPages] = useState(1)
	const [isRendering, setIsRendering] = useState(false)
	const [containerWidth, setContainerWidth] = useState(0)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const resizeObserverRef = useRef<ResizeObserver | null>(null)
	const observerSetupRef = useRef(false)
	const renderTaskRef = useRef<any>(null)

	// Load PDF document when URL changes
	useEffect(() => {
		if (!pdfUrl) return

		let mounted = true

		const loadPdf = async () => {
			try {
				const pdfjs = await getPdfjs()
				const loadingTask = pdfjs.getDocument(pdfUrl)
				const pdf = await loadingTask.promise
				
				if (mounted) {
					setPdfDoc(pdf)
					setTotalPages(pdf.numPages)
				}
			} catch (error) {
				console.error('Failed to load PDF:', error)
			}
		}

		loadPdf()

		return () => {
			mounted = false
		}
	}, [pdfUrl])

	// Render current page when page number, zoom, or container width changes
	useEffect(() => {
		if (!pdfDoc || !canvasRef.current || !containerRef.current) return

		// Set up ResizeObserver once when we know the container exists
		if (!observerSetupRef.current) {
			const parentElement = containerRef.current.parentElement
			if (parentElement) {
				setContainerWidth(parentElement.clientWidth)
				
				resizeObserverRef.current = new ResizeObserver((entries) => {
					for (const entry of entries) {
						const width = entry.contentRect.width
						setContainerWidth(width)
					}
				})
				
				resizeObserverRef.current.observe(parentElement)
				observerSetupRef.current = true
			}
		}

		let mounted = true

		const renderPage = async () => {
			// Cancel any ongoing render operation
			if (renderTaskRef.current) {
				try {
					renderTaskRef.current.cancel()
				} catch (e) {
					// Ignore cancellation errors
				}
			}

			setIsRendering(true)
			try {
				const page = await pdfDoc.getPage(currentPage)
				const canvas = canvasRef.current
				const container = containerRef.current
				
				if (!mounted || !canvas || !container) return

				const context = canvas.getContext('2d', { 
					alpha: false,
					desynchronized: true
				})
				if (!context) return

				// Use the tracked container width, fallback to current width if not yet set
				const fullWidth = containerWidth || container.clientWidth
				// Account for padding (p-6 = 24px on each side = 48px total)
				const paddingTotal = 48
				const availableWidth = fullWidth - paddingTotal
				const viewport = page.getViewport({ scale: 1 })
				
				// Apply zoom scaling
				const scale = (zoom / 100) * (availableWidth / viewport.width)
				
				// Get device pixel ratio for high-DPI displays (retina, etc.)
				// Use a minimum of 2 for better quality even on standard displays
				const pixelRatio = Math.max(window.devicePixelRatio || 1, 4)
				
				// Render at higher resolution for crisp output
				const outputScale = scale * pixelRatio
				const scaledViewport = page.getViewport({ scale: outputScale })

				// Set canvas actual size (high resolution for crisp rendering)
				canvas.width = scaledViewport.width
				canvas.height = scaledViewport.height

				// Set canvas display size (CSS size)
				canvas.style.width = `${scaledViewport.width / pixelRatio}px`
				canvas.style.height = `${scaledViewport.height / pixelRatio}px`

				// Disable image smoothing for crisp text rendering
				context.imageSmoothingEnabled = false

				// Render PDF page
				const renderContext = {
					canvasContext: context,
					viewport: scaledViewport,
					canvas: canvas
				}

				renderTaskRef.current = page.render(renderContext)
				await renderTaskRef.current.promise
				renderTaskRef.current = null
				
				if (mounted) {
					setIsRendering(false)
				}
			} catch (error: any) {
				if (error?.name !== 'RenderingCancelledException') {
					console.error('Failed to render page:', error)
				}
				if (mounted) {
					setIsRendering(false)
				}
			}
		}

		renderPage()

		return () => {
			mounted = false
			// Cancel render task on cleanup
			if (renderTaskRef.current) {
				try {
					renderTaskRef.current.cancel()
				} catch (e) {
					// Ignore cancellation errors
				}
			}
		}
	}, [pdfDoc, currentPage, zoom, containerWidth, isCollapsed])

	// Cleanup ResizeObserver on unmount
	useEffect(() => {
		return () => {
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect()
			}
		}
	}, [])

	return {
		totalPages,
		isRendering,
		canvasRef,
		containerRef
	}
}
