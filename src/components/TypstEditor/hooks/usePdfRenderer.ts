import { useState, useEffect, useRef } from 'react'
import { getPdfjs } from '@/lib/pdf/pdfjs'
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'

interface UsePdfRendererProps {
	pdfUrl: string | null
	currentPage: number
	zoom: number
	isCollapsed: boolean
	onPageChange?: (page: number) => void
}

interface CanvasInfo {
	canvas: HTMLCanvasElement
	renderTask: RenderTask | null
}

export function usePdfRenderer({ pdfUrl, currentPage, zoom, isCollapsed, onPageChange }: UsePdfRendererProps) {
	const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
	const [totalPages, setTotalPages] = useState(1)
	const [isRendering, setIsRendering] = useState(false)
	const [containerWidth, setContainerWidth] = useState(0)
	const canvasRefs = useRef<Map<number, CanvasInfo>>(new Map())
	const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map())
	const containerRef = useRef<HTMLDivElement | null>(null)
	const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
	const resizeObserverRef = useRef<ResizeObserver | null>(null)
	const observerSetupRef = useRef(false)
	const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
	const programmaticScrollRef = useRef(false)
	const lastPageChangeRef = useRef(currentPage)

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

	// Scroll to current page when it changes from button clicks
	useEffect(() => {
		const pageChanged = currentPage !== lastPageChangeRef.current
		lastPageChangeRef.current = currentPage
		
		if (!pageChanged) return
		
		// Only scroll if this was a programmatic change (button click)
		if (programmaticScrollRef.current) {
			const pageElement = pageRefs.current.get(currentPage)
			if (pageElement) {
				pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
			programmaticScrollRef.current = false
		}
	}, [currentPage])

	// Render all pages when document, zoom, or container width changes
	useEffect(() => {
		if (!pdfDoc || !containerRef.current) return

		// Capture the current canvas refs for cleanup
		const canvasRefsSnapshot = canvasRefs.current

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

		const renderAllPages = async () => {
			// Cancel any ongoing render operations
			canvasRefs.current.forEach((canvasInfo) => {
				if (canvasInfo.renderTask) {
					try {
						canvasInfo.renderTask.cancel()
					} catch {
						// Ignore cancellation errors
					}
				}
			})

			setIsRendering(true)
			try {
				const container = containerRef.current
				if (!mounted || !container) return

				// Use the tracked container width, fallback to current width if not yet set
				const fullWidth = containerWidth || container.clientWidth
				// Account for padding (p-6 = 24px on each side = 48px total)
				const paddingTotal = 48
				const availableWidth = fullWidth - paddingTotal

				// Render each page
				for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
					const page = await pdfDoc.getPage(pageNum) as PDFPageProxy
					const canvasInfo = canvasRefs.current.get(pageNum)
					const textLayerDiv = textLayerRefs.current.get(pageNum)
					
					if (!mounted || !canvasInfo) continue

					const canvas = canvasInfo.canvas
					const context = canvas.getContext('2d', {
						alpha: false,
						desynchronized: true
					}) as CanvasRenderingContext2D | null
					if (!context) continue

					const viewport = page.getViewport({ scale: 1 })
					
					// Apply zoom scaling
					const scale = (zoom / 100) * (availableWidth / viewport.width)
					
					// Get device pixel ratio for high-DPI displays (retina, etc.)
					// Use a minimum of 2 for better quality even on standard displays
					const pixelRatio = Math.max(window.devicePixelRatio || 1, 4)
					
					// Render at higher resolution for crisp output
					const outputScale = scale * pixelRatio
					const scaledViewport = page.getViewport({ scale: outputScale })
					
					// Viewport for text layer (at display scale, not output scale)
					const textLayerViewport = page.getViewport({ scale })

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

					const renderTask = page.render(renderContext)
					canvasInfo.renderTask = renderTask
					if (renderTask && renderTask.promise) {
						await renderTask.promise
					}
					canvasInfo.renderTask = null
					
					// Render text layer for text selection
					if (textLayerDiv) {
						// Clear previous text layer content
						textLayerDiv.innerHTML = ''
						textLayerDiv.style.width = `${scaledViewport.width / pixelRatio}px`
						textLayerDiv.style.height = `${scaledViewport.height / pixelRatio}px`
						
						try {
							const textContent = await page.getTextContent()
							const pdfjs = await getPdfjs()
							
							// Create and render text layer using PDF.js TextLayer class
							const textLayer = new pdfjs.TextLayer({
								textContentSource: textContent,
								container: textLayerDiv,
								viewport: textLayerViewport
							})
							
							await textLayer.render()
						} catch (error) {
							console.error('Failed to render text layer:', error)
						}
					}
				}
				
				if (mounted) {
					setIsRendering(false)
				}
			} catch (error: unknown) {
				const err = error as { name?: string }
				if (err?.name !== 'RenderingCancelledException') {
					console.error('Failed to render pages:', error)
				}
				if (mounted) {
					setIsRendering(false)
				}
			}
		}

		renderAllPages()

		return () => {
			mounted = false
			// Cancel render tasks on cleanup
			canvasRefsSnapshot.forEach((canvasInfo) => {
				if (canvasInfo.renderTask) {
					try {
						canvasInfo.renderTask.cancel()
					} catch {
						// Ignore cancellation errors
					}
				}
			})
		}
	}, [pdfDoc, zoom, containerWidth, isCollapsed])

	// Set up IntersectionObserver to track visible pages
	useEffect(() => {
		if (!totalPages || !onPageChange) return

		const options = {
			root: containerRef.current,
			rootMargin: '-20% 0px -20% 0px', // Trigger when page is in middle 60% of viewport
			threshold: 0
		}

		intersectionObserverRef.current = new IntersectionObserver((entries) => {
			// Find the most visible page
			let mostVisiblePage = currentPage
			let maxVisibility = 0

			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '0')
					if (pageNum && entry.intersectionRatio > maxVisibility) {
						maxVisibility = entry.intersectionRatio
						mostVisiblePage = pageNum
					}
				}
			})

			if (mostVisiblePage !== currentPage && maxVisibility > 0) {
				// Page changed from scrolling, don't trigger programmatic scroll
				programmaticScrollRef.current = false
				onPageChange(mostVisiblePage)
			}
		}, options)

		// Observe all page elements
		pageRefs.current.forEach((pageElement, pageNum) => {
			if (intersectionObserverRef.current) {
				pageElement.setAttribute('data-page-num', pageNum.toString())
				intersectionObserverRef.current.observe(pageElement)
			}
		})

		return () => {
			if (intersectionObserverRef.current) {
				intersectionObserverRef.current.disconnect()
			}
		}
	}, [totalPages, onPageChange, currentPage])

	// Cleanup ResizeObserver on unmount
	useEffect(() => {
		return () => {
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect()
			}
		}
	}, [])

	// Function to trigger programmatic page change (from buttons)
	const scrollToPage = (page: number) => {
		programmaticScrollRef.current = true
		if (onPageChange) {
			onPageChange(page)
		}
	}

	return {
		totalPages,
		isRendering,
		canvasRefs,
		pageRefs,
		textLayerRefs,
		containerRef,
		scrollToPage
	}
}
