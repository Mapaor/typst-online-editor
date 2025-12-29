/**
 * Creates a debounced function that delays invoking func until after delay milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<Args extends unknown[], R>(
	func: (...args: Args) => R,
	delay: number
): {
	(...args: Args): void
	cancel: () => void
} {
	let timeoutId: number | null = null

	const debounced = (...args: Args) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId)
		}

		timeoutId = window.setTimeout(() => {
			func(...args)
			timeoutId = null
		}, delay)
	}

	debounced.cancel = () => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId)
			timeoutId = null
		}
	}

	return debounced
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}

/**
 * Download a PDF from a URL
 */
export function downloadPdfFromUrl(url: string, filename: string = 'document.pdf'): void {
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
}
