'use client'

import { useState } from 'react'
import { downloadPdfFromUrl } from '@/lib/utils/helpers'
import { TYPST_EXAMPLES, fetchExample } from '@/lib/typst/examples/TypstExamples'
import type { Project } from '@/lib/storage/ProjectStorage'
import FileExplorer from '../FileExplorer/index'
import TypstEditorHeader from './TypstEditorHeader'
import CodeEditor from './CodeEditor'
import PdfPreview from './PdfPreview'
import ResizeHandle from './ResizeHandle'
import { useTypstCompiler } from './hooks/useTypstCompiler'
import { useProjectManagement } from './hooks/useProjectManagement'
import { useResizePanel } from './hooks/useResizePanel'

const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_MAX_WIDTH = 600
const SIDEBAR_DEFAULT_WIDTH = 280
const SIDEBAR_COLLAPSED_WIDTH = 48

const EDITOR_MIN_WIDTH = 300
const EDITOR_DEFAULT_WIDTH = 500
const PREVIEW_MIN_WIDTH = 440 // Minimum width for PDF preview (toolbar requires 400px)
const PREVIEW_COLLAPSED_WIDTH = 48

export default function TypstEditor() {
	const [showExamples, setShowExamples] = useState(false)
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
	const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false)
	
	// Compiler management
	const { status, pdfUrl, errorMsg, hasCompiled, compileNow, compileDebounced } = useTypstCompiler()
	
	// Project and file management
	const {
		currentProject,
		activeFilePath,
		getActiveFile,
		updateActiveFileContent,
		loadProject,
		handleFileSelect,
		handleFileCreate,
		handleFolderCreate,
		handleFileRename,
		handleFileMove,
		handleFileDelete,
	} = useProjectManagement((files, mainFile) => {
		compileDebounced(files, mainFile)
	})
	
	// Sidebar resize (left panel)
	const sidebarResize = useResizePanel({
		minValue: SIDEBAR_MIN_WIDTH,
		maxValue: SIDEBAR_MAX_WIDTH,
		initialValue: SIDEBAR_DEFAULT_WIDTH,
	})
	
	// Editor resize (middle panel)
	const editorResize = useResizePanel({
		minValue: EDITOR_MIN_WIDTH,
		maxValue: 5000, // High max, constrained dynamically
		initialValue: EDITOR_DEFAULT_WIDTH,
	})

	const handleCompileNow = async () => {
		const filesMap = currentProject.files.reduce<Record<string, string>>((acc, file) => {
			acc[file.path] = file.content
			return acc
		}, {})
		await compileNow(filesMap, currentProject.mainFile)
	}

	const handleDownload = () => {
		if (pdfUrl) {
			downloadPdfFromUrl(pdfUrl, 'document.pdf')
		}
	}

	const loadExample = async (exampleId: string) => {
		const example = TYPST_EXAMPLES.find(ex => ex.id === exampleId)
		if (example) {
			try {
				const code = await fetchExample(example.filePath)
				
				const newProject: Project = {
					id: crypto.randomUUID(),
					name: example.name,
					files: [
						{
							path: 'main.typ',
							content: code,
							lastModified: 0,
						},
					],
					mainFile: 'main.typ',
					createdAt: 0,
					lastModified: 0,
				}
				
				loadProject(newProject)
				setShowExamples(false)
			} catch (error) {
				console.error('Failed to load example:', error)
			}
		}
	}

	const effectiveSidebarWidth = isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarResize.value
	const effectivePreviewWidth = isPreviewCollapsed ? PREVIEW_COLLAPSED_WIDTH : PREVIEW_MIN_WIDTH
	const isAnyResizing = sidebarResize.isResizing || editorResize.isResizing

	return (
		<div className="flex flex-col h-screen bg-gray-900 text-white">
			{/* Global resize overlay - prevents iframe from capturing cursor */}
			{isAnyResizing && (
				<div 
					className="fixed inset-0 z-50 cursor-col-resize"
					style={{ backgroundColor: 'transparent' }}
				/>
			)}
			
			<TypstEditorHeader
				status={status}
				hasCompiled={hasCompiled}
				pdfUrl={pdfUrl}
				showExamples={showExamples}
				onToggleExamples={() => setShowExamples(!showExamples)}
				onCompileNow={handleCompileNow}
				onDownload={handleDownload}
				onLoadExample={loadExample}
			/>

			<div className="flex flex-1 overflow-hidden">
				{/* File Explorer Sidebar */}
				<div 
					style={{ 
						width: `${effectiveSidebarWidth}px`,
						minWidth: `${effectiveSidebarWidth}px`,
						maxWidth: `${effectiveSidebarWidth}px`,
						transition: isSidebarCollapsed ? 'width 0.2s ease-in-out' : 'none'
					}}
					className="shrink-0"
				>
					<FileExplorer
						project={currentProject}
						activeFile={activeFilePath}
						onFileSelect={handleFileSelect}
						onFileCreate={handleFileCreate}
						onFolderCreate={handleFolderCreate}
						onFileDelete={handleFileDelete}
						onFileRename={handleFileRename}
						onFileMove={handleFileMove}
						isCollapsed={isSidebarCollapsed}
						onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
					/>
				</div>

				{/* Sidebar Resize Handle */}
				{!isSidebarCollapsed && (
					<ResizeHandle
						isResizing={sidebarResize.isResizing}
						onMouseDown={sidebarResize.startResize}
					/>
				)}

				{/* Editor + Preview Container - Takes remaining space */}
				<div className="flex flex-1 min-w-0 overflow-hidden" id="editor-preview-container">
					{/* Code Editor */}
					<div 
						className={isPreviewCollapsed ? "flex-1 min-w-0" : "shrink-0"}
						style={isPreviewCollapsed ? {
							minWidth: `${EDITOR_MIN_WIDTH}px`,
						} : { 
							width: `${editorResize.value}px`,
							minWidth: `${EDITOR_MIN_WIDTH}px`,
							maxWidth: `${editorResize.value}px`,
						}}
					>
						<CodeEditor
							filePath={activeFilePath}
							content={getActiveFile()?.content || ''}
							onChange={updateActiveFileContent}
						/>
					</div>

					{/* Editor/Preview Resize Handle */}
					{!isPreviewCollapsed && (
						<ResizeHandle
							isResizing={editorResize.isResizing}
							onMouseDown={(e) => {
								// Dynamically calculate max width based on actual container size
								// This prevents the editor from exceeding available space
								const container = document.getElementById('editor-preview-container')
								if (container) {
									const containerWidth = container.offsetWidth
									const handleWidth = 6
									const maxEditorWidth = containerWidth - effectivePreviewWidth - handleWidth
									editorResize.setMaxValue(maxEditorWidth)
								}
								editorResize.startResize(e)
							}}
						/>
					)}

					{/* PDF Preview - Takes remaining space */}
					<div 
						className={isPreviewCollapsed ? "shrink-0" : "flex-1 min-w-0"}
						style={isPreviewCollapsed ? { 
							width: `${PREVIEW_COLLAPSED_WIDTH}px`,
							minWidth: `${PREVIEW_COLLAPSED_WIDTH}px`,
							maxWidth: `${PREVIEW_COLLAPSED_WIDTH}px`,
							transition: 'width 0.2s ease-in-out'
						} : {
							minWidth: `${PREVIEW_MIN_WIDTH}px`,
						}}
					>
						<PdfPreview
							pdfUrl={pdfUrl}
							status={status}
							errorMsg={errorMsg}
							hasCompiled={hasCompiled}
							fileCount={currentProject.files.length}
							charCount={getActiveFile()?.content.length || 0}
							isCollapsed={isPreviewCollapsed}
							onToggleCollapse={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
