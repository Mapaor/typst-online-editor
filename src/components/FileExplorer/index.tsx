'use client'

import { PanelLeftClose, PanelLeft } from 'lucide-react'
import type { FileExplorerProps } from './types'
import type { FileNode } from './types'
import { useFileTree } from './hooks/useFileTree'
import { useFileOperations } from './hooks/useFileOperations'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { buildFileTree } from './utils/buildFileTree'
import FileExplorerHeader from './FileExplorerHeader'
import FileExplorerActions from './FileExplorerActions'
import CreateItemInput from './CreateItemInput'
import FolderTreeItem from './FolderTreeItem'
import FileTreeItem from './FileTreeItem'

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
						onDrop={(e) => handleDrop(node.path, true, e)}
					>
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
				className="flex-1 overflow-y-auto"
				onDragOver={(e) => {
					if (draggedItem && !e.defaultPrevented) {
						handleDragOver('', false, e)
					}
				}}
				onDrop={(e) => {
					if (draggedItem && !e.defaultPrevented) {
						handleDrop('', false, e)
					}
				}}
			>
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