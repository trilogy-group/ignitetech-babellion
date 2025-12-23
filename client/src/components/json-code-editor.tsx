import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Upload, AlertCircle, Check, FileJson, Wand2, Info, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface JsonCodeEditorRef {
  getValue: () => string;
  /** Returns sanitized JSON (with escaped control chars) if sanitization was needed, otherwise returns raw content */
  getValidJson: () => string | null;
  setValue: (value: string) => void;
  format: () => void;
  wasSanitized: () => boolean;
  /** Opens the Compare dialog showing original vs translated text nodes */
  showCompare: () => void;
  /** Returns the text node count for enabling/disabling Compare button */
  getTextNodeCount: () => number;
  /** Triggers the file input for importing JSON */
  triggerFileInput: () => void;
}

interface JsonCodeEditorProps {
  content: string;
  onChange: (json: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  error?: string | null;
  /** Translated JSON content for the View Text comparison */
  translatedContent?: string;
  /** Hide line numbers (useful for mobile) */
  hideLineNumbers?: boolean;
}

interface TextNodeItem {
  index: number;
  original: string;
  translated?: string;
}

/**
 * Extract all TEXT nodes from Figma JSON recursively
 */
function extractTextNodesFromJson(json: unknown, path: string[] = []): { text: string; path: string[] }[] {
  const textNodes: { text: string; path: string[] }[] = [];

  if (typeof json !== 'object' || json === null) {
    return textNodes;
  }

  const obj = json as Record<string, unknown>;

  // Check if this is a TEXT node with a text property
  if (obj.kind === 'TEXT' && typeof obj.text === 'string') {
    textNodes.push({ text: obj.text, path: [...path, 'text'] });
  }

  // Recurse into arrays and objects
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        textNodes.push(...extractTextNodesFromJson(item, [...path, key, String(index)]));
      });
    } else if (typeof value === 'object' && value !== null) {
      textNodes.push(...extractTextNodesFromJson(value, [...path, key]));
    }
  }

  return textNodes;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
  textNodeCount?: number;
  wasSanitized?: boolean;
  sanitizedJson?: string;
}

/**
 * Calculate line and column from a character position in a string
 */
function getLineAndColumn(str: string, position: number): { line: number; column: number } {
  const lines = str.substring(0, position).split('\n');
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length || 0) + 1;
  return { line, column };
}

/**
 * Extract position from JSON parse error message
 */
function extractPositionFromError(errorMessage: string): number | null {
  // Match patterns like "at position 255476" or "position 255476"
  const positionMatch = errorMessage.match(/(?:at\s+)?position\s+(\d+)/i);
  if (positionMatch) {
    return parseInt(positionMatch[1], 10);
  }
  return null;
}

/**
 * Sanitize JSON string by escaping control characters inside string values.
 * This fixes common issues with Figma exports that have literal newlines in text.
 */
function sanitizeJsonString(jsonString: string): { sanitized: string; wasModified: boolean } {
  let result = '';
  let inString = false;
  let wasModified = false;
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const prevChar = i > 0 ? jsonString[i - 1] : '';
    
    // Check if we're entering or exiting a string
    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
      result += char;
      continue;
    }
    
    // If we're inside a string, escape control characters
    if (inString) {
      const charCode = char.charCodeAt(0);
      
      // Control characters (0x00-0x1F) need to be escaped
      if (charCode < 0x20) {
        wasModified = true;
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          // Other control characters as \uXXXX
          result += '\\u' + charCode.toString(16).padStart(4, '0');
        }
        continue;
      }
    }
    
    result += char;
  }
  
  return { sanitized: result, wasModified };
}

function validateFigmaJson(jsonString: string): ValidationResult {
  if (!jsonString.trim()) {
    return { isValid: true }; // Empty is valid (no content yet)
  }

  // First, try to parse the original JSON
  let jsonToParse = jsonString;
  let wasSanitized = false;
  let sanitizedJson: string | undefined;

  try {
    JSON.parse(jsonString);
  } catch {
    // If parsing fails, try sanitizing the JSON first
    const { sanitized, wasModified } = sanitizeJsonString(jsonString);
    if (wasModified) {
      jsonToParse = sanitized;
      wasSanitized = true;
      sanitizedJson = sanitized;
    }
  }

  try {
    const parsed = JSON.parse(jsonToParse);
    
    // Count TEXT nodes recursively
    let textNodeCount = 0;
    const countTextNodes = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      
      if (Array.isArray(node)) {
        node.forEach(countTextNodes);
        return;
      }
      
      const obj = node as Record<string, unknown>;
      if (obj.kind === 'TEXT' && typeof obj.text === 'string') {
        textNodeCount++;
      }
      
      // Recursively check all object properties
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value && typeof value === 'object') {
          countTextNodes(value);
        }
      }
    };
    
    countTextNodes(parsed);
    
    return {
      isValid: true,
      textNodeCount,
      wasSanitized,
      sanitizedJson,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Invalid JSON';
    
    // Try to extract line/column from the error
    let errorLine: number | undefined;
    let errorColumn: number | undefined;
    
    const position = extractPositionFromError(errorMessage);
    if (position !== null) {
      const { line, column } = getLineAndColumn(jsonString, position);
      errorLine = line;
      errorColumn = column;
    }
    
    return {
      isValid: false,
      error: errorMessage,
      errorLine,
      errorColumn,
    };
  }
}

export const JsonCodeEditor = forwardRef<JsonCodeEditorRef, JsonCodeEditorProps>(({
  content,
  onChange,
  onBlur,
  placeholder = 'Paste Figma JSON here or drag & drop a .json file...',
  editable = true,
  className,
  error: externalError,
  translatedContent,
  hideLineNumbers = false,
}, ref) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>(() => validateFigmaJson(content));
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 50 });
  const [isViewTextOpen, setIsViewTextOpen] = useState(false);
  const [textNodes, setTextNodes] = useState<TextNodeItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastValidatedContent = useRef<string>(content);

  // Re-validate when content changes from props (e.g., file loaded)
  useEffect(() => {
    if (content !== lastValidatedContent.current) {
      lastValidatedContent.current = content;
      const result = validateFigmaJson(content);
      setValidationResult(result);
    }
  }, [content]);

  // Extract text nodes for the View Text dialog
  const handleViewText = useCallback(() => {
    try {
      // Parse original JSON
      const jsonToParse = validationResult.sanitizedJson || content;
      const parsedOriginal = JSON.parse(jsonToParse);
      const originalNodes = extractTextNodesFromJson(parsedOriginal);

      // Parse translated JSON if available
      let translatedNodes: { text: string; path: string[] }[] = [];
      if (translatedContent) {
        try {
          const parsedTranslated = JSON.parse(translatedContent);
          translatedNodes = extractTextNodesFromJson(parsedTranslated);
        } catch {
          // Translated content invalid, ignore
        }
      }

      // Build comparison list
      const items: TextNodeItem[] = originalNodes.map((node, index) => ({
        index: index + 1,
        original: node.text,
        translated: translatedNodes[index]?.text,
      }));

      setTextNodes(items);
      setIsViewTextOpen(true);
    } catch {
      // JSON invalid
    }
  }, [content, validationResult.sanitizedJson, translatedContent]);

  // Calculate line count
  const lineCount = content ? content.split('\n').length : 1;
  const LINE_HEIGHT = 26; // Line height in pixels (matches 1.625rem)
  const BUFFER_LINES = 20; // Extra lines to render above/below viewport

  // Update visible range on scroll
  const updateVisibleRange = useCallback(() => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const viewportHeight = textareaRef.current.clientHeight;
      const startLine = Math.max(1, Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES);
      const endLine = Math.min(lineCount, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + BUFFER_LINES);
      setVisibleRange({ start: startLine, end: endLine });
    }
  }, [lineCount]);

  // Sync scroll and update visible range
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    updateVisibleRange();
  }, [updateVisibleRange]);

  // Initialize visible range
  useEffect(() => {
    updateVisibleRange();
  }, [updateVisibleRange, content]);

  // Scroll to error line when error changes
  useEffect(() => {
    if (validationResult.errorLine && textareaRef.current) {
      const scrollTo = (validationResult.errorLine - 5) * LINE_HEIGHT; // Scroll a bit above the error
      textareaRef.current.scrollTop = Math.max(0, scrollTo);
      updateVisibleRange();
    }
  }, [validationResult.errorLine, updateVisibleRange]);

  // Validate on content change
  const handleChange = useCallback((value: string) => {
    const result = validateFigmaJson(value);
    setValidationResult(result);
    onChange(value);
  }, [onChange]);

  // Format JSON (uses sanitized version if available)
  const formatJson = useCallback(() => {
    if (!content.trim()) return;
    
    try {
      // Use sanitized JSON if available, otherwise try original
      const jsonToParse = validationResult.sanitizedJson || content;
      const parsed = JSON.parse(jsonToParse);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      // After formatting, the content is now properly escaped, so no sanitization needed
      setValidationResult({ isValid: true, textNodeCount: validationResult.textNodeCount, wasSanitized: false });
    } catch {
      // Already invalid, validation will show error
    }
  }, [content, onChange, validationResult.textNodeCount]);

  // File handling
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.txt')) {
      setValidationResult({ isValid: false, error: 'Please upload a .json or .txt file' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleChange(text);
    };
    reader.onerror = () => {
      setValidationResult({ isValid: false, error: 'Failed to read file' });
    };
    reader.readAsText(file);
  }, [handleChange]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editable) {
      setIsDragOver(true);
    }
  }, [editable]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!editable) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [editable, handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getValue: () => content,
    getValidJson: () => {
      if (!validationResult.isValid) return null;
      // Return sanitized version if it exists, otherwise return original
      return validationResult.sanitizedJson || content;
    },
    setValue: (value: string) => handleChange(value),
    format: formatJson,
    wasSanitized: () => validationResult.wasSanitized || false,
    showCompare: handleViewText,
    getTextNodeCount: () => validationResult.textNodeCount || 0,
    triggerFileInput,
  }), [content, handleChange, formatJson, validationResult, handleViewText, triggerFileInput]);

  const displayError = externalError || (!validationResult.isValid ? validationResult.error : null);
  const showSuccess = validationResult.isValid && validationResult.textNodeCount !== undefined && validationResult.textNodeCount > 0;

  return (
    <div className={cn('border rounded-md bg-background flex flex-col', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Toolbar - matches rich text editor style */}
      {editable && (
        <div className="border-b border-border px-2 py-1.5 flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatJson}
            disabled={!content.trim() || !validationResult.isValid}
            className="h-7 px-2"
            title="Format JSON"
          >
            <Wand2 className="h-3.5 w-3.5" />
          </Button>
          
          {/* Divider */}
          <div className="h-5 w-px bg-border mx-1" />
          
          {/* Status indicators */}
          <div className="ml-auto flex items-center gap-2 text-xs">
            {validationResult.wasSanitized && (
              <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1" title="Control characters in text strings were automatically escaped">
                <Info className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Auto-fixed</span>
              </span>
            )}
            {showSuccess && (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>{validationResult.textNodeCount} text nodes</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error banner with line number */}
      {displayError && validationResult.errorLine && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive">
            <span className="font-bold">Error at Line {validationResult.errorLine}, Column {validationResult.errorColumn}:</span>{' '}
            <span className="opacity-90">
              {displayError.replace(/\s*\(line \d+ column \d+\)/, '').replace(/\s*at position \d+/, '')}
            </span>
          </span>
        </div>
      )}

      {/* Editor area */}
      <div
        className={cn(
          'relative flex-1 min-h-[200px]',
          isDragOver && 'ring-2 ring-primary ring-inset',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <FileJson className="h-12 w-12" />
              <span className="font-medium">Drop JSON file here</span>
            </div>
          </div>
        )}

        {/* Editor with line numbers */}
        <div className="flex h-full min-h-[200px]">
          {/* Line numbers gutter - virtualized for performance, hidden on mobile */}
          {!hideLineNumbers && (
            <div
              ref={lineNumbersRef}
              className="flex-shrink-0 bg-muted/50 dark:bg-muted/20 border-r border-border overflow-y-scroll select-none scrollbar-hide"
              style={{ width: lineCount > 9999 ? '60px' : lineCount > 999 ? '50px' : '40px' }}
            >
              <div 
                className="py-4 pr-2 text-right font-mono text-xs text-muted-foreground"
                style={{ height: lineCount * LINE_HEIGHT + 32 }} // Total height for scroll matching
              >
                {/* Spacer for lines above visible range */}
                <div style={{ height: (visibleRange.start - 1) * LINE_HEIGHT }} />
                
                {/* Only render visible line numbers */}
                {Array.from({ length: visibleRange.end - visibleRange.start + 1 }, (_, i) => visibleRange.start + i).map((lineNum) => (
                  <div
                    key={lineNum}
                    className={cn(
                      'px-2',
                      validationResult.errorLine === lineNum && 'bg-destructive/20 text-destructive font-bold'
                    )}
                    style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
                  >
                    {lineNum}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            onScroll={handleScroll}
            placeholder={placeholder}
            disabled={!editable}
            spellCheck={false}
            className={cn(
              'flex-1 h-full min-h-[200px] py-4 px-3 resize-none',
              'font-mono text-sm',
              'bg-muted/30 dark:bg-muted/10',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              displayError && 'border-destructive',
            )}
            style={{
              tabSize: 2,
              lineHeight: `${LINE_HEIGHT}px`,
            }}
          />
        </div>

        {/* Empty state */}
        {!content.trim() && editable && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground p-8">
              <FileJson className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Import Figma JSON</p>
              <p className="text-sm">
                Drag & drop a .json file here, or click "Import File" to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Compare Text Nodes Dialog */}
      <Dialog open={isViewTextOpen} onOpenChange={setIsViewTextOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 w-[95vw] sm:w-auto">
          <DialogHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg">Compare Text Nodes ({textNodes.length})</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 mr-6"
                onClick={() => {
                  const data = textNodes.map(node => ({
                    original: node.original,
                    translated: node.translated || null,
                  }));
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                }}
                title="Copy as JSON array"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-2 sm:px-6 py-2 sm:py-4">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="text-xs sm:text-sm font-medium text-muted-foreground border-b">
                  <th className="text-left py-1 sm:py-2 w-8 sm:w-12">#</th>
                  <th className="text-left py-1 sm:py-2 w-1/2">Original</th>
                  <th className="text-left py-1 sm:py-2 w-1/2">Translated</th>
                </tr>
              </thead>
              <tbody>
                {textNodes.map((node) => (
                  <tr key={node.index} className="text-xs sm:text-sm border-b border-border/50">
                    <td className="py-1.5 sm:py-3 align-top text-muted-foreground font-mono text-[10px] sm:text-xs">{node.index}</td>
                    <td className="py-1.5 sm:py-3 pr-1 sm:pr-2 align-top">
                      <div className="whitespace-pre-wrap break-words bg-muted/30 rounded p-1 sm:p-2 text-foreground text-[11px] sm:text-sm leading-tight sm:leading-normal">
                        {node.original}
                      </div>
                    </td>
                    <td className="py-1.5 sm:py-3 align-top">
                      <div className={cn(
                        "whitespace-pre-wrap break-words rounded p-1 sm:p-2 text-[11px] sm:text-sm leading-tight sm:leading-normal",
                        node.translated 
                          ? "bg-green-500/10 text-foreground" 
                          : "bg-muted/10 text-muted-foreground italic"
                      )}>
                        {node.translated || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {textNodes.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No text nodes found in the JSON
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

JsonCodeEditor.displayName = 'JsonCodeEditor';

