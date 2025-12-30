/// <reference lib="webworker" />

import {
	createTypstCompiler,
	loadFonts,
	type TypstCompiler,
	FetchPackageRegistry,
	MemoryAccessModel
} from '@myriaddreamin/typst.ts';
import { withPackageRegistry, withAccessModel } from '@myriaddreamin/typst.ts/options.init';

// ============================================================================
// Type Definitions
// ============================================================================

type CompileRequest = {
	type: 'compile';
	id: string;
	files: Record<string, string>; // Map of file path to content
	mainFile: string; // Which file to compile
	images?: Record<string, Uint8Array<ArrayBuffer>>;
};

type CompileResponse =
	| {
			type: 'compile-result';
			id: string;
			ok: true;
			pdf: ArrayBuffer;
			diagnostics: string[];
	  }
	| {
			type: 'compile-result';
			id: string;
			ok: false;
			error: string;
			diagnostics: string[];
	  };

// ============================================================================
// Configuration
// ============================================================================

// OPTION 1: Load from CDN (jsdelivr)
// Pros: No local storage needed, always up-to-date, shared cache across sites
// Cons: Requires internet connection, slower initial load, external dependency
/*
const TYPST_VERSION = '0.7.0-rc2';
const TYPST_WASM_URL = `https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@${TYPST_VERSION}/pkg/typst_ts_web_compiler_bg.wasm`;

const CORE_FONTS: string[] = [
	https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/IBMPlexSans-Regular.ttf',
	'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/IBMPlexSans-Bold.ttf',
	'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts/NewCMMath-Regular.otf',
	'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts/NewCMMath-Book.otf'
];

const EMOJI_FONTS: string[] = [
	'https://fonts.gstatic.com/s/notocoloremoji/v37/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFab4.ttf'
];

const CJK_FONTS: string[] = [
	'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts/NotoSerifCJKsc-Regular.otf',
	'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts/NotoSansCJKsc-Regular.otf'
];
*/

// OPTION 2: Load from local public folder (CURRENT - Recommended for offline use)
// Pros: Faster loading, works offline, no external dependencies, predictable performance
// Cons: Increases bundle size, requires manual updates, uses local storage
const TYPST_WASM_URL = '/wasm/typst_ts_web_compiler_bg.wasm';

const CORE_FONTS: string[] = [
	// IBM Plex Sans (Modern UI fonts)
	'/fonts/IBMPlexSans-Regular.ttf',
	'/fonts/IBMPlexSans-Bold.ttf',
	// Math fonts (Critical for mathematical formulas)
	'/fonts/NewCMMath-Regular.otf',
	'/fonts/NewCMMath-Book.otf'
];

const EMOJI_FONTS: string[] = [
	// Emoji support (Noto Color Emoji ~9MB) - Loaded on demand
	'/fonts/NotoColorEmoji.ttf'
];

const CJK_FONTS: string[] = [
	// CJK (Chinese/Japanese/Korean) fonts - Loaded on demand
	// Note: These are large files (~15-20MB each)
	'/fonts/NotoSerifCJKsc-Regular.otf',
	'/fonts/NotoSansCJKsc-Regular.otf'
];

// ============================================================================
// State Management
// ============================================================================

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let compilerPromise: Promise<TypstCompiler> | null = null;
let compileQueue: Promise<void> = Promise.resolve();
let emojiLoaded = false;
let cjkLoaded = false;
let lastCompileTime = Date.now();

// Package registry for Typst Universe packages (mitex, cetz, fletcher, etc.)
const accessModel = new MemoryAccessModel();
const packageRegistry = new FetchPackageRegistry(accessModel);

// Compiler lifecycle: Reset after 30 minutes of inactivity to free memory
const COMPILER_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fetches the Typst WASM module
 */
async function fetchWasmModule(): Promise<ArrayBuffer> {
	// Construct absolute URL from worker's origin
	const absoluteUrl = new URL(TYPST_WASM_URL, self.location.origin).href;
	const response = await fetch(absoluteUrl);
	return await response.arrayBuffer();
}

/**
 * Converts relative font URLs to absolute URLs
 */
function resolveFont(fontPath: string): string {
	return new URL(fontPath, self.location.origin).href;
}

/**
 * Creates a compiler with specified fonts
 */
async function createCompilerWithFonts(fonts: string[]): Promise<TypstCompiler> {
	const compiler = createTypstCompiler();
	// Resolve all font paths to absolute URLs
	const absoluteFonts = fonts.map(resolveFont);
	await compiler.init({
		getModule: fetchWasmModule,
		beforeBuild: [
			loadFonts(absoluteFonts, {
				assets: ['text']
			}),
			withAccessModel(accessModel),
			withPackageRegistry(packageRegistry)
		]
	});
	return compiler;
}

/**
 * Detects if text requires emoji fonts
 */
function needsEmojiFont(text: string): boolean {
	return /[\uD800-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/.test(text);
}

/**
 * Detects if text contains CJK (Chinese, Japanese, Korean) characters
 */
function needsCJKFont(text: string): boolean {
	// CJK Unified Ideographs and extensions
	return /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]|[\u3040-\u309F\u30A0-\u30FF]|[\uAC00-\uD7AF]/.test(text);
}

/**
 * Gets the current font set based on loaded fonts
 */
function getCurrentFonts(): string[] {
	const fonts = [...CORE_FONTS];
	if (emojiLoaded) fonts.push(...EMOJI_FONTS);
	if (cjkLoaded) fonts.push(...CJK_FONTS);
	return fonts;
}

// ============================================================================
// Compiler Management
// ============================================================================

/**
 * Upgrades compiler with emoji fonts (lazy loading)
 */
async function upgradeCompilerWithEmoji(): Promise<void> {
	if (emojiLoaded) return;

	emojiLoaded = true;
	console.log('[Typst] Upgrading compiler with emoji fonts...');
	
	const newCompiler = await createCompilerWithFonts(getCurrentFonts());
	compilerPromise = Promise.resolve(newCompiler);
	
	console.log('[Typst] Emoji fonts loaded successfully');
}

/**
 * Upgrades compiler with CJK fonts (lazy loading)
 */
async function upgradeCompilerWithCJK(): Promise<void> {
	if (cjkLoaded) return;

	cjkLoaded = true;
	console.log('[Typst] Upgrading compiler with CJK fonts...');
	
	const newCompiler = await createCompilerWithFonts(getCurrentFonts());
	compilerPromise = Promise.resolve(newCompiler);
	
	console.log('[Typst] CJK fonts loaded successfully');
}

/**
 * Gets the compiler instance, creating it if necessary
 */
function getCompiler(): Promise<TypstCompiler> {
	// Check if compiler should be reset due to inactivity
	if (compilerPromise && Date.now() - lastCompileTime > COMPILER_IDLE_TIMEOUT) {
		console.log('[Typst] Resetting compiler after idle timeout');
		compilerPromise = null;
		emojiLoaded = false;
		cjkLoaded = false;
	}

	if (compilerPromise) return compilerPromise;

	console.log('[Typst] Initializing new compiler instance');
	compilerPromise = createCompilerWithFonts(CORE_FONTS);
	return compilerPromise;
}

/**
 * Manually reset compiler (useful for memory management)
 */
function resetCompiler(): void {
	console.log('[Typst] Manual compiler reset');
	compilerPromise = null;
	emojiLoaded = false;
	cjkLoaded = false;
}

// ============================================================================
// Compilation
// ============================================================================

async function compilePdf(
	files: Record<string, string>,
	mainFile: string,
	images: Record<string, Uint8Array<ArrayBuffer>> = {}
): Promise<{ pdf: Uint8Array; diagnostics: string[] }> {
	// Update last compile time for lifecycle management
	lastCompileTime = Date.now();

	// Check content for special font requirements and upgrade compiler if needed
	const allContent = Object.values(files).join('\n');
	
	// Lazy load emoji fonts
	if (needsEmojiFont(allContent)) {
		await upgradeCompilerWithEmoji();
	}
	
	// Lazy load CJK fonts
	if (needsCJKFont(allContent)) {
		await upgradeCompilerWithCJK();
	}

	const compiler = await getCompiler();
	
	// Add all source files to the virtual file system
	for (const [path, content] of Object.entries(files)) {
		// Ensure paths start with /
		const normalizedPath = path.startsWith('/') ? path : '/' + path;
		compiler.addSource(normalizedPath, content);
	}

	// Add images to virtual file system
	for (const [path, data] of Object.entries(images)) {
		const normalizedPath = path.startsWith('/') ? path : '/' + path;
		compiler.mapShadow(normalizedPath, data);
	}

	// Ensure mainFile path starts with /
	const normalizedMainFile = mainFile.startsWith('/') ? mainFile : '/' + mainFile;

	// Compile the document
	const result = await compiler.compile({
		mainFilePath: normalizedMainFile,
		format: 1, // PDF format
		diagnostics: 'unix' // Unix-style diagnostic messages
	});

	// Process diagnostics
	const diagnostics = (result.diagnostics ?? []).map(String);
	
	// Enhanced error reporting
	if (!result.result) {
		const errorMessage = diagnostics.length > 0 
			? diagnostics.join('\n')
			: 'Typst compilation failed with no diagnostic information';
		
		console.error('[Typst] Compilation failed:', errorMessage);
		throw new Error(errorMessage);
	}

	// Log warnings if present (even on successful compilation)
	if (diagnostics.length > 0) {
		console.warn('[Typst] Compilation warnings:', diagnostics.join('\n'));
	}

	return { pdf: result.result, diagnostics };
}

// ============================================================================
// Message Handler
// ============================================================================

ctx.onmessage = (event: MessageEvent<CompileRequest>) => {
	const message = event.data;
	if (!message || message.type !== 'compile') return;

	compileQueue = compileQueue.then(async () => {
		try {
			const { pdf, diagnostics } = await compilePdf(message.files, message.mainFile, message.images);
			const pdfCopy = new Uint8Array(pdf.length);
			pdfCopy.set(pdf);
			ctx.postMessage(
				{
					type: 'compile-result',
					id: message.id,
					ok: true,
					pdf: pdfCopy.buffer,
					diagnostics
				} satisfies CompileResponse,
				[pdfCopy.buffer]
			);
		} catch (error) {
			ctx.postMessage({
				type: 'compile-result',
				id: message.id,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
				diagnostics: []
			} satisfies CompileResponse);
		}
	});
};
