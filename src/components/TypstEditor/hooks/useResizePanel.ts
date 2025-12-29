import { useState, useEffect, useCallback, useRef } from 'react'

interface UseResizePanelOptions {
	minValue: number
	maxValue: number
	initialValue: number
	onResize?: (value: number) => void
}

export function useResizePanel(options: UseResizePanelOptions) {
	const { minValue, initialValue, onResize } = options
	const [value, setValue] = useState(initialValue)
	const [isResizing, setIsResizing] = useState(false)
	const [dynamicMaxValue, setDynamicMaxValue] = useState(options.maxValue)
	const startXRef = useRef(0)
	const startValueRef = useRef(initialValue)

	const startResize = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setIsResizing(true)
		startXRef.current = e.clientX
		startValueRef.current = value
	}, [value])

	useEffect(() => {
		if (!isResizing) return

		const handleMouseMove = (e: MouseEvent) => {
			const delta = e.clientX - startXRef.current
			const newValue = startValueRef.current + delta
			const clampedValue = Math.min(Math.max(newValue, minValue), dynamicMaxValue)
			
			setValue(clampedValue)
			onResize?.(clampedValue)
		}

		const handleMouseUp = () => {
			setIsResizing(false)
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
		document.body.style.cursor = 'col-resize'
		document.body.style.userSelect = 'none'

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isResizing, minValue, dynamicMaxValue])

	return {
		value,
		isResizing,
		startResize,
		setValue,
		setMaxValue: setDynamicMaxValue,
	}
}
