'use client'

import { useState } from 'react'
import { PanelLeft, Upload } from 'lucide-react'
import type { FileExplorerProps } from './types'
import type { FileNode } from './types'
import { useFileTree } from './hooks/useFileTree'
import { useFileOperations } from './hooks/useFileOperations'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { buildFileTree } from './utils/buildFileTree'
import FileExplorerHeader from './components/FileExplorerHeader'
import FileExplorerActions from './components/FileExplorerActions'
import CreateItemInput from './components/CreateItemInput'
import FolderTreeItem from './components/FolderTreeItem'
import FileTreeItem from './components/FileTreeItem'


const ALLOWED_EXTENSIONS = ['.typ', '.txt', '.md', '.mdx','.png', '.jpg', '.jpeg', '.svg', '.json', '.csv', '.dat', '.yml', '.yaml', '.toml', '.ttf', '.otf']

export default function FileExplorer({
	project,
	activeFile,
	onFileSelect,
	onFileCreate,
	onFolderCreate,
	onFileDelete,
	onFileRename,
	onFileMove,
	isCollapsed = false,
	onToggleCollapse,
}: FileExplorerProps) {
	const [isDraggingExternal, setIsDraggingExternal] = useState(false)
	// Track nested drag enter/leave events to properly handle drag state
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [dragOverCounter, setDragOverCounter] = useState(0)
	const { expandedFolders, toggleFolder, expandFolder } = useFileTree()
	
	const {
		creatingItem,
		setCreatingItem,
		newItemName,
		setNewItemName,
		renamingItem,
		renameValue,
		setRenameValue,
		selectedItem,
		setSelectedItem,
		handleCreateItem,
		handleCancelCreate,
		handleStartRename,
		handleRename,
		handleCancelRename,
	} = useFileOperations(onFileCreate, onFolderCreate, onFileRename, expandFolder)

	const {
		draggedItem,
		dropTarget,
		handleDragStart,
		handleDragEnd,
		handleDragOver,
		handleDrop,
	} = useDragAndDrop(onFileMove)

	// Helper function to determine parent path for new items
	function getParentPathForNewItem(): string {
		if (!selectedItem) {
			// No selection -> create in root
			return ''
		}
		if (selectedItem.isFolder) {
			// Folder selected -> create inside folder
			return selectedItem.path
		} else {
			// File selected -> create in same directory as file
			const parts = selectedItem.path.split('/')
			return parts.slice(0, -1).join('/')
		}
	}

	// Helper function to check if file extension is allowed
	function isAllowedFile(fileName: string): boolean {
		return ALLOWED_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext))
	}

	// Helper function to handle external file drops
	async function handleExternalFileDrop(files: FileList, targetPath: string = '') {
		for (const file of Array.from(files)) {
			if (!isAllowedFile(file.name)) {
				console.warn(`File ${file.name} has unsupported extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
				continue
			}

			const filePath = targetPath ? `${targetPath}/${file.name}` : file.name
			
			// Check if file already exists
			const fileExists = project.files.some(f => f.path === filePath)
			if (fileExists) {
				const overwrite = confirm(`File "${file.name}" already exists. Do you want to overwrite it?`)
				if (!overwrite) continue
			}

			try {
				// Read file content based on type
				if (file.name.match(/\.(png|jpg|jpeg|svg|ttf|otf)$/i)) {
					// For binary files (images and fonts), read as data URL
					const reader = new FileReader()
					reader.onload = (e) => {
						const content = e.target?.result as string
						onFileCreate(filePath, content)
					}
					reader.readAsDataURL(file)
				} else {
					// For text files, read as text
					const reader = new FileReader()
					reader.onload = (e) => {
						const content = e.target?.result as string
						onFileCreate(filePath, content)
					}
					reader.readAsText(file)
				}
			} catch (error) {
				console.error(`Failed to upload file ${file.name}:`, error)
			}
		}
	}

	// Handle external drag events
	function handleExternalDragEnter(e: React.DragEvent) {
		if (e.dataTransfer.types.includes('Files')) {
			e.preventDefault()
			e.stopPropagation()
			setDragOverCounter(prev => prev + 1)
			setIsDraggingExternal(true)
		}
	}

	function handleExternalDragLeave(e: React.DragEvent) {
		if (e.dataTransfer.types.includes('Files')) {
			e.preventDefault()
			e.stopPropagation()
			setDragOverCounter(prev => {
				const newCount = prev - 1
				if (newCount === 0) {
					setIsDraggingExternal(false)
				}
				return newCount
			})
		}
	}

	function handleExternalDragOver(e: React.DragEvent) {
		if (e.dataTransfer.types.includes('Files')) {
			e.preventDefault()
			e.stopPropagation()
			e.dataTransfer.dropEffect = 'copy'
		}
	}

	async function handleExternalDrop(e: React.DragEvent, targetPath: string = '') {
		if (e.dataTransfer.types.includes('Files')) {
			e.preventDefault()
			e.stopPropagation()
			setIsDraggingExternal(false)
			setDragOverCounter(0)

			const files = e.dataTransfer.files
			if (files.length > 0) {
				await handleExternalFileDrop(files, targetPath)
			}
		}
	}

	function renderFileTree(nodes: FileNode[], depth = 0): React.ReactNode {
		return nodes.map(node => {
			if (node.isFolder) {
				const isExpanded = expandedFolders.has(node.path)
				const isRenaming = renamingItem === node.path
				const isDropTarget = dropTarget === node.path
				const isSelected = selectedItem?.path === node.path

				return (
					<FolderTreeItem
						key={node.path}
						node={node}
						depth={depth}
						isExpanded={isExpanded}
						isRenaming={isRenaming}
						isDropTarget={isDropTarget}
						isSelected={isSelected}
						renameValue={renameValue}
						onToggle={() => toggleFolder(node.path)}
						onSelect={() => setSelectedItem({ path: node.path, isFolder: true })}
						onStartRename={() => handleStartRename(node.path, true)}
						onRename={handleRename}
						onCancelRename={handleCancelRename}
						onRenameChange={setRenameValue}
						onDelete={() => onFileDelete(node.path)}
						onDragOver={(e) => handleDragOver(node.path, true, e)}
						onDrop={(e) => handleDrop(node.path, true, e)}							onExternalDrop={handleExternalDrop}					>
						{isExpanded && node.children && renderFileTree(node.children, depth + 1)}
						{isExpanded && creatingItem?.parentPath === node.path && (
							<CreateItemInput
								type={creatingItem.type}
								value={newItemName}
								onChange={setNewItemName}
								onConfirm={handleCreateItem}
								onCancel={handleCancelCreate}
								depth={depth + 1}
							/>
						)}
					</FolderTreeItem>
				)
			} else {
				const isActive = node.path === activeFile
				const isMainFile = node.path === project.mainFile
				const fileName = node.path.split('/').pop() || node.path
				const isRenaming = renamingItem === node.path
				const isDragging = draggedItem === node.path
				const canDrag = node.path !== 'main.typ'
				const canRename = node.path !== 'main.typ'
				const canDelete = node.path !== 'main.typ'

				return (
					<FileTreeItem
						key={node.path}
						fileName={fileName}
						depth={depth}
						isActive={isActive}
						isMainFile={isMainFile}
						isRenaming={isRenaming}
						isDragging={isDragging}
						canDrag={canDrag}
						canRename={canRename}
						canDelete={canDelete}
						renameValue={renameValue}
						onSelect={() => {
							onFileSelect(node.path)
							setSelectedItem({ path: node.path, isFolder: false })
						}}
						onStartRename={() => handleStartRename(node.path, false)}
						onRename={handleRename}
						onCancelRename={handleCancelRename}
						onRenameChange={setRenameValue}
						onDelete={() => onFileDelete(node.path)}
						onDragStart={(e) => handleDragStart(node.path, e)}
						onDragEnd={handleDragEnd}
					/>
				)
			}
		})
	}

	const fileTree = buildFileTree(project)

	if (isCollapsed) {
		return (
			<div className="h-full flex flex-col items-center justify-start bg-gray-900 border-r border-gray-700">
				<button
					onClick={onToggleCollapse}
					className="p-3 hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
					title="Show Files"
				>
					<PanelLeft className="w-5 h-5" />
				</button>
			</div>
		)
	}

	return (
		<div className="relative h-full flex flex-col w-full bg-gray-900 border-r border-gray-700">
			<FileExplorerHeader project={project} onToggleCollapse={onToggleCollapse || (() => {})} />

			{/* Files List */}
			<div 
				className={`flex-1 overflow-y-auto relative transition-colors ${
					isDraggingExternal ? 'bg-blue-900/20 border-2 border-dashed border-blue-500' : ''
				}`}
				onDragEnter={handleExternalDragEnter}
				onDragLeave={handleExternalDragLeave}
				onDragOver={(e) => {
					if (e.dataTransfer.types.includes('Files')) {
						handleExternalDragOver(e)
					} else if (draggedItem && !e.defaultPrevented) {
						handleDragOver('', false, e)
					}
				}}
				onDrop={(e) => {
					if (e.dataTransfer.types.includes('Files')) {
						handleExternalDrop(e, '')
					} else if (draggedItem && !e.defaultPrevented) {
						handleDrop('', false, e)
					}
				}}
			>
				{isDraggingExternal && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 pointer-events-none z-10">
						<div className="text-center">
							<Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
							<p className="text-blue-300 font-medium">Drop files to upload</p>
							<p className="text-gray-400 text-sm mt-1">
								Supported: {ALLOWED_EXTENSIONS.join(', ')}
							</p>
						</div>
					</div>
				)}
				{renderFileTree(fileTree)}
				{creatingItem?.parentPath === '' && (
					<CreateItemInput
						type={creatingItem.type}
						value={newItemName}
						onChange={setNewItemName}
						onConfirm={handleCreateItem}
						onCancel={handleCancelCreate}
						depth={0}
					/>
				)}
			</div>

			<FileExplorerActions
				onCreateFile={() => {
					const parentPath = getParentPathForNewItem()
					if (parentPath) expandFolder(parentPath)
					setCreatingItem({ type: 'file', parentPath })
				}}
				onCreateFolder={() => {
					const parentPath = getParentPathForNewItem()
					if (parentPath) expandFolder(parentPath)
					setCreatingItem({ type: 'folder', parentPath })
				}}
			/>
		</div>
	)
}