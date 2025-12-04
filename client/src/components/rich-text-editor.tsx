import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { useEffect, useMemo, useState, useImperativeHandle, forwardRef, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Mark } from '@tiptap/core';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
  MessageSquare,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Custom Highlight mark extension
const Highlight = Mark.create({
  name: 'highlight',
  addAttributes() {
    return {
      color: {
        default: 'yellow',
        parseHTML: element => element.getAttribute('data-color') || 'yellow',
        renderHTML: attributes => {
          if (!attributes.color) {
            return {};
          }
          return {
            'data-color': attributes.color,
          };
        },
      },
    };
  },
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  parseHTML() {
    return [
      {
        tag: 'mark',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          const element = node as HTMLElement;
          const color = element.getAttribute('data-color') || 'yellow';
          return { color };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes, mark }) {
    // Get color from mark attributes (when created programmatically) or HTMLAttributes (when parsing from HTML)
    const color = mark?.attrs?.color || HTMLAttributes?.['data-color'] || 'yellow';
    
    // Use CSS variables for better dark mode support
    const backgroundColorClass = color === 'green' 
      ? 'bg-green-200 dark:bg-green-700/60' 
      : 'bg-yellow-200 dark:bg-yellow-600/60';
    
    return ['mark', { 
      ...this.options.HTMLAttributes, 
      ...HTMLAttributes, 
      'data-color': color,
      class: backgroundColorClass,
      style: 'padding: 2px 0;' 
    }, 0];
  },
  addCommands() {
    return {
      setHighlight: (attributes?: { color?: string }) => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      toggleHighlight: (attributes?: { color?: string }) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },
      unsetHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});

export interface RichTextEditorRef {
  highlightText: (searchText: string, color?: 'yellow' | 'green') => void;
  clearHighlights: () => void;
  replaceText: (oldText: string, newText: string) => void;
  replaceHTML: (oldHTML: string, newHTML: string) => boolean;
  scrollToText: (searchText: string) => void;
  getText: () => string;
  getHTML: () => string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  editorKey?: string; // Add unique key for multiple editors
  showFeedbackButton?: boolean; // Show feedback button on text selection
  onFeedbackClick?: (selectedText: string) => void; // Callback when feedback is clicked
  showRawHtmlButton?: boolean; // Show raw HTML toggle button
  isRawView?: boolean; // Current state of raw view
  onRawViewToggle?: () => void; // Callback when raw view is toggled
}

const MenuBar = ({ 
  editor, 
  showFeedbackButton, 
  onFeedbackClick,
  showRawHtmlButton,
  isRawView,
  onRawViewToggle
}: { 
  editor: Editor | null;
  showFeedbackButton?: boolean;
  onFeedbackClick?: (selectedText: string) => void;
  showRawHtmlButton?: boolean;
  isRawView?: boolean;
  onRawViewToggle?: () => void;
}) => {
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    };

    editor.on('selectionUpdate', updateSelection);
    editor.on('update', updateSelection);

    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('update', updateSelection);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleFeedbackClick = () => {
    if (!onFeedbackClick) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    if (selectedText) {
      onFeedbackClick(selectedText);
    }
  };

  // Mobile-responsive button classes
  const btnClass = "h-9 w-9 md:h-7 md:w-7 p-0 min-h-touch md:min-h-0 min-w-touch md:min-w-0 flex-shrink-0";
  const iconClass = "h-4 w-4 md:h-3.5 md:w-3.5";
  const dividerClass = "w-px h-6 md:h-5 bg-border mx-1 md:mx-0.5 self-center flex-shrink-0";

  return (
    <div className="border-b border-border p-2 md:p-1.5 flex overflow-x-auto scrollbar-hide md:overflow-visible md:flex-wrap gap-1 md:gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(editor.isActive('bold') && 'bg-accent', btnClass)}
      >
        <Bold className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(editor.isActive('italic') && 'bg-accent', btnClass)}
      >
        <Italic className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(editor.isActive('underline') && 'bg-accent', btnClass)}
      >
        <UnderlineIcon className={iconClass} />
      </Button>
      <div className={dividerClass} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(editor.isActive('heading', { level: 1 }) && 'bg-accent', btnClass)}
      >
        <Heading1 className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent', btnClass)}
      >
        <Heading2 className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent', btnClass)}
      >
        <Heading3 className={iconClass} />
      </Button>
      <div className={dividerClass} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(editor.isActive('bulletList') && 'bg-accent', btnClass)}
      >
        <List className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(editor.isActive('orderedList') && 'bg-accent', btnClass)}
      >
        <ListOrdered className={iconClass} />
      </Button>
      <div className={dividerClass} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={cn(editor.isActive({ textAlign: 'left' }) && 'bg-accent', btnClass)}
      >
        <AlignLeft className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={cn(editor.isActive({ textAlign: 'center' }) && 'bg-accent', btnClass)}
      >
        <AlignCenter className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={cn(editor.isActive({ textAlign: 'right' }) && 'bg-accent', btnClass)}
      >
        <AlignRight className={iconClass} />
      </Button>
      <div className={dividerClass} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addLink}
        className={cn(editor.isActive('link') && 'bg-accent', btnClass)}
      >
        <LinkIcon className={iconClass} />
      </Button>
      {showRawHtmlButton && (
        <>
          <div className={dividerClass} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRawViewToggle}
            className={cn(isRawView && 'bg-accent', btnClass)}
            title={isRawView ? "Switch to Rich Text" : "Switch to Raw HTML"}
          >
            <Code className={iconClass} />
          </Button>
        </>
      )}
      <div className={dividerClass} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={btnClass}
      >
        <Undo className={iconClass} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={btnClass}
      >
        <Redo className={iconClass} />
      </Button>
      {showFeedbackButton && hasSelection && (
        <>
          <div className={dividerClass} />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleFeedbackClick}
            className="h-9 md:h-7 px-2 md:px-2 bg-primary text-primary-foreground min-h-touch md:min-h-0"
          >
            <MessageSquare className={iconClass + " mr-1"} />
            Feedback
          </Button>
        </>
      )}
    </div>
  );
};

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  content,
  onChange,
  onBlur,
  placeholder = 'Start typing...',
  editable = true,
  className,
  editorKey,
  showFeedbackButton = false,
  onFeedbackClick,
  showRawHtmlButton = false,
  isRawView = false,
  onRawViewToggle,
}, ref) => {
  // Track when we're applying view-only highlights (shouldn't trigger onChange)
  const isApplyingHighlightsRef = useRef(false);
  // Track when we're programmatically setting content (shouldn't trigger onChange)
  const isSettingContentRef = useRef(false);
  
  // Memoize extensions to prevent duplicate warnings and unnecessary recreations
  // Each extension instance is created once and reused across renders
  const extensions = useMemo(() => {
    // Create extension instances once to avoid TipTap duplicate warnings
    const linkExtension = Link.configure({
      openOnClick: false,
    });
    
    const underlineExtension = Underline;
    
    const textAlignExtension = TextAlign.configure({
      types: ['heading', 'paragraph'],
    });
    
    const placeholderExtension = Placeholder.configure({
      placeholder,
    });
    
    return [
      StarterKit,
      underlineExtension,
      linkExtension,
      textAlignExtension,
      TextStyle,
      Color,
      placeholderExtension,
      Highlight,
    ];
  }, [placeholder]);

  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor }) => {
      // Skip onChange when applying view-only highlights or programmatically setting content
      if (isApplyingHighlightsRef.current || isSettingContentRef.current) {
        return;
      }
      onChange(editor.getHTML());
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
          'dark:prose-invert',
          'prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
          'prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
          'prose-strong:text-foreground prose-em:text-foreground',
          'prose-a:text-primary hover:prose-a:text-primary/80',
          'prose-code:text-foreground',
          'prose-pre:bg-muted prose-pre:text-foreground',
          'text-foreground',
          !editable && 'cursor-default'
        ),
      },
    },
  }, [editorKey, extensions]); // Re-create editor when key or extensions change

  // Update editor content when prop changes
  useEffect(() => {
    if (!editor) return;
    
    // Don't update if editor is focused (user is typing)
    if (editor.isFocused) return;
    
    const currentContent = editor.getHTML();
    
    // Normalize for comparison - treat empty states as equivalent
    const normalizeContent = (c: string | null | undefined) => {
      if (!c || c === '<p></p>' || c === '') return '';
      return c;
    };
    
    const normalizedCurrent = normalizeContent(currentContent);
    const normalizedNew = normalizeContent(content);
    
    // Don't update if content is effectively the same
    if (normalizedCurrent === normalizedNew) {
      return;
    }
    
    // Set flag to prevent onChange from firing (this is a programmatic update, not a user edit)
    isSettingContentRef.current = true;
    editor.commands.setContent(content || '');
    // Clear flag after a tick to allow future user edits to trigger onChange
    setTimeout(() => {
      isSettingContentRef.current = false;
    }, 0);
  }, [content, editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    highlightText: (searchText: string, color: 'yellow' | 'green' = 'yellow') => {
      if (!editor || !searchText) return;
      
      // Check if editor view is available
      if (!editor.view || !editor.state) {
        console.warn('Editor not fully initialized yet');
        return;
      }
      
      // Set flag to prevent onChange from being called (view-only highlights)
      isApplyingHighlightsRef.current = true;
      
      // Clear existing highlights first using our clearHighlights method
      // This ensures all marks are removed before applying new ones
      const { tr, doc } = editor.state;
      let modified = false;
      
      doc.descendants((node, pos) => {
        if (node.marks.some(mark => mark.type.name === 'highlight')) {
          const from = pos;
          const to = pos + node.nodeSize;
          tr.removeMark(from, to, editor.schema.marks.highlight);
          modified = true;
        }
        return true;
      });
      
      if (modified) {
        editor.view.dispatch(tr);
      }
      
      // Normalize search text - trim whitespace
      const normalizedSearch = searchText.trim();
      if (!normalizedSearch) {
        isApplyingHighlightsRef.current = false;
        return;
      }
      
      // Get plain text content from the editor
      const plainText = editor.state.doc.textContent;
      
      // Escape special regex characters for literal matching
      const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Find all occurrences (case-insensitive)
      const regex = new RegExp(escapedSearch, 'gi');
      const textMatches: Array<{ index: number; length: number }> = [];
      let match;
      
      while ((match = regex.exec(plainText)) !== null) {
        textMatches.push({ index: match.index, length: match[0].length });
      }
      
      if (textMatches.length === 0) {
        isApplyingHighlightsRef.current = false;
        return;
      }
      
      // Map text positions to document positions
      // Build a complete mapping of text positions to document positions
      const positionMap: Array<{ textIndex: number; docPos: number }> = [];
      let textOffset = 0;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.isText) {
          const nodeText = node.text || '';
          for (let i = 0; i < nodeText.length; i++) {
            positionMap.push({ textIndex: textOffset + i, docPos: pos + i });
          }
          textOffset += nodeText.length;
        }
        return true;
      });
      
      // Now map all text matches to document positions
      const matches: Array<{ from: number; to: number }> = [];
      
      for (const textMatch of textMatches) {
        const startIdx = textMatch.index;
        const endIdx = textMatch.index + textMatch.length - 1;
        
        // Find document positions for start and end
        let from = -1;
        let to = -1;
        
        for (const mapping of positionMap) {
          if (mapping.textIndex === startIdx) {
            from = mapping.docPos;
          }
          if (mapping.textIndex === endIdx) {
            to = mapping.docPos + 1; // +1 because 'to' is exclusive
          }
          if (from !== -1 && to !== -1) break;
        }
        
        if (from !== -1 && to !== -1) {
          matches.push({ from, to });
        }
      }
      
      // Fallback: if we didn't find matches, try direct character matching
      if (matches.length === 0) {
        for (const textMatch of textMatches) {
          // Try to find the position by counting characters
          let charCount = 0;
          let foundFrom = -1;
          let foundTo = -1;
          
          editor.state.doc.descendants((node, pos) => {
            if (node.isText && foundFrom === -1) {
              const nodeText = node.text || '';
              const nodeLength = nodeText.length;
              
              if (charCount <= textMatch.index && charCount + nodeLength > textMatch.index) {
                // Found the start
                foundFrom = pos + (textMatch.index - charCount);
                const matchEnd = textMatch.index + textMatch.length;
                if (matchEnd <= charCount + nodeLength) {
                  foundTo = pos + (matchEnd - charCount);
                } else {
                  foundTo = pos + nodeLength;
                }
                matches.push({ from: foundFrom, to: foundTo });
                return false; // Stop after first match in this node
              }
              
              charCount += nodeLength;
            }
            return true;
          });
        }
      }
      
      // Store current selection
      const currentSelection = editor.state.selection;
      
      // Apply highlight to each match
      if (matches.length > 0) {
        // Double-check editor view is still available before dispatching
        if (!editor.view) {
          console.warn('Editor view not available for highlighting');
          isApplyingHighlightsRef.current = false;
          return;
        }
        
        const { tr } = editor.state;
        matches.forEach(({ from, to }) => {
          // Validate positions
          if (from < to && from >= 0 && to <= editor.state.doc.content.size) {
            try {
              tr.addMark(from, to, editor.schema.marks.highlight.create({ color }));
            } catch (e) {
              // Ignore invalid position errors
              console.warn('Invalid highlight position:', { from, to, error: e });
            }
          }
        });
        
        // Apply transaction
        editor.view.dispatch(tr);
        
        // Restore cursor position
        if (currentSelection && currentSelection.anchor >= 0) {
          try {
            editor.commands.setTextSelection(currentSelection.anchor);
          } catch (e) {
            // Ignore selection errors
          }
        }
      }
      
      // Clear the flag after highlight operation completes
      isApplyingHighlightsRef.current = false;
    },
    
    clearHighlights: () => {
      if (!editor || !editor.view) return;
      
      // Set flag to prevent onChange from being called (view-only highlights)
      isApplyingHighlightsRef.current = true;
      
      try {
        // Use a transaction to remove all highlight marks from the entire document
        const { tr, doc } = editor.state;
        let modified = false;
        
        doc.descendants((node, pos) => {
          if (node.marks.some(mark => mark.type.name === 'highlight')) {
            const from = pos;
            const to = pos + node.nodeSize;
            tr.removeMark(from, to, editor.schema.marks.highlight);
            modified = true;
          }
          return true;
        });
        
        if (modified) {
          editor.view.dispatch(tr);
        }
      } catch (e) {
        // Fallback to the simple command
        try {
          editor.commands.unsetHighlight();
        } catch (err) {
          console.warn('Failed to clear highlights:', err);
        }
      } finally {
        // Clear the flag after highlight operation completes
        isApplyingHighlightsRef.current = false;
      }
    },
    
    replaceText: (oldText: string, newText: string) => {
      if (!editor || !oldText) return;
      
      // Check if editor view is available
      if (!editor.view || !editor.state) {
        console.warn('Editor not fully initialized yet');
        return;
      }
      
      // Normalize search text - trim whitespace
      const normalizedOldText = oldText.trim();
      if (!normalizedOldText) return;
      
      // Get plain text and find matches
      const plainText = editor.state.doc.textContent;
      
      // Escape special regex characters for literal matching
      const escapedSearch = normalizedOldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'gi');
      
      // Find text matches
      const textMatches: Array<{ index: number; length: number }> = [];
      let match;
      
      while ((match = searchRegex.exec(plainText)) !== null) {
        textMatches.push({ index: match.index, length: match[0].length });
      }
      
      if (textMatches.length === 0) return;
      
      // Build position map
      const positionMap: Array<{ textIndex: number; docPos: number }> = [];
      let textOffset = 0;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.isText) {
          const nodeText = node.text || '';
          for (let i = 0; i < nodeText.length; i++) {
            positionMap.push({ textIndex: textOffset + i, docPos: pos + i });
          }
          textOffset += nodeText.length;
        }
        return true;
      });
      
      // Map text matches to document positions using the position map
      const matches: Array<{ from: number; to: number }> = [];
      
      for (const textMatch of textMatches) {
        const startIdx = textMatch.index;
        const endIdx = textMatch.index + textMatch.length - 1;
        
        // Find document positions for start and end
        let from = -1;
        let to = -1;
        
        for (const mapping of positionMap) {
          if (mapping.textIndex === startIdx) {
            from = mapping.docPos;
          }
          if (mapping.textIndex === endIdx) {
            to = mapping.docPos + 1; // +1 because 'to' is exclusive
          }
          if (from !== -1 && to !== -1) break;
        }
        
        if (from !== -1 && to !== -1) {
          matches.push({ from, to });
        }
      }
      
      // Remove duplicates
      const uniqueMatches = matches.filter((match, index, self) =>
        index === self.findIndex(m => m.from === match.from && m.to === match.to)
      );
      
      // Replace in reverse order to maintain correct positions
      if (uniqueMatches.length > 0) {
        // Sort matches by position (descending) for reverse replacement
        uniqueMatches.sort((a, b) => b.from - a.from);
        
        uniqueMatches.forEach(({ from, to }) => {
          // Validate positions
          if (from < to && from >= 0 && to <= editor.state.doc.content.size) {
            try {
              // Select the text and replace it
              editor.chain()
                .setTextSelection({ from, to })
                .deleteSelection()
                .insertContent(newText)
                .run();
            } catch (e) {
              console.warn('Invalid replace position:', { from, to, error: e });
            }
          }
        });
      }
    },
    
    scrollToText: (searchText: string) => {
      if (!editor || !searchText) return;
      
      try {
        // Check if editor view is available
        if (!editor.view || !editor.state) {
          console.warn('Editor view not available yet');
          return;
        }
        
        // Normalize search text - trim whitespace
        const normalizedSearch = searchText.trim();
        if (!normalizedSearch) return;
        
        // Get plain text content from the editor
        const plainText = editor.state.doc.textContent;
        
        // Escape special regex characters for literal matching
        const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Find first occurrence (case-insensitive)
        const regex = new RegExp(escapedSearch, 'i');
        const match = regex.exec(plainText);
        
        if (!match) return;
        
        const textStartIdx = match.index;
        const textEndIdx = match.index + match[0].length;
        
        // Build position map to convert text positions to document positions
        const positionMap: Array<{ textIndex: number; docPos: number }> = [];
        let textOffset = 0;
        
        editor.state.doc.descendants((node, pos) => {
          if (node.isText) {
            const nodeText = node.text || '';
            for (let i = 0; i < nodeText.length; i++) {
              positionMap.push({ textIndex: textOffset + i, docPos: pos + i });
            }
            textOffset += nodeText.length;
          }
          return true;
        });
        
        // Find document positions for start and end
        let from = -1;
        let to = -1;
        
        for (const mapping of positionMap) {
          if (mapping.textIndex === textStartIdx && from === -1) {
            from = mapping.docPos;
          }
          if (mapping.textIndex === textEndIdx - 1 && to === -1) {
            to = mapping.docPos + 1; // +1 because 'to' is exclusive
          }
          if (from !== -1 && to !== -1) break;
        }
        
        if (from === -1 || to === -1) return;
        
        // Validate positions
        if (from < 0 || to <= from || to > editor.state.doc.content.size) {
          console.warn('Invalid scroll positions:', { from, to });
          return;
        }
        
        // Use ProseMirror's DOM mapping to find the DOM node
        setTimeout(() => {
          try {
            const { view } = editor;
            if (!view) return;
            
            // Get the DOM coordinates for the document position
            const startPos = view.coordsAtPos(from);
            const endPos = view.coordsAtPos(to);
            
            if (!startPos || !endPos) return;
            
            // Find the editor's scrollable container
            const editorElement = view.dom.closest('.editor-content-scrollable') as HTMLElement;
            if (!editorElement) return;
            
            // Calculate the middle point of the highlighted text
            const middleY = (startPos.top + endPos.bottom) / 2;
            
            // Get the scroll container's position and dimensions
            const containerRect = editorElement.getBoundingClientRect();
            const containerTop = containerRect.top + editorElement.scrollTop;
            const containerHeight = editorElement.clientHeight;
            
            // Calculate the target scroll position to center the text
            const targetScrollTop = middleY - containerRect.top - (containerHeight / 2) + editorElement.scrollTop;
            
            // Smooth scroll to the target position
            editorElement.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth',
            });
          } catch (e) {
            // Fallback: try using selection-based scrolling
            try {
              editor.commands.setTextSelection({ from, to });
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = editor.view?.dom.closest('.editor-content-scrollable') as HTMLElement;
                if (container && range.commonAncestorContainer) {
                  const node = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
                    ? range.commonAncestorContainer.parentElement
                    : range.commonAncestorContainer as HTMLElement;
                  if (node) {
                    const nodeRect = node.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const scrollTop = container.scrollTop + (nodeRect.top - containerRect.top) - (container.clientHeight / 2);
                    container.scrollTo({
                      top: Math.max(0, scrollTop),
                      behavior: 'smooth',
                    });
                  }
                }
              }
            } catch (fallbackError) {
              console.warn('Could not scroll to text:', fallbackError);
            }
          }
        }, 100);
      } catch (error) {
        console.warn('scrollToText error:', error);
      }
    },
    replaceHTML: (oldHTML: string, newHTML: string): boolean => {
      if (!editor || !oldHTML) return false;
      
      // Get current HTML content
      const currentHTML = editor.getHTML();
      
      // Do a direct string replacement
      const updatedHTML = currentHTML.replace(oldHTML, newHTML);
      
      // Check if replacement happened
      if (updatedHTML === currentHTML) {
        console.warn('No replacement made - old HTML not found in editor content');
        console.warn('Looking for:', oldHTML.substring(0, 200));
        console.warn('In content:', currentHTML.substring(0, 500));
        return false;
      }
      
      // Set the new HTML content (this will re-render the editor)
      editor.commands.setContent(updatedHTML);
      return true;
    },
    
    getText: () => {
      if (!editor) return "";
      return editor.state.doc.textContent;
    },
    getHTML: () => {
      if (!editor) return "";
      return editor.getHTML();
    },
  }), [editor]);

  return (
    <div className={cn('border rounded-md bg-background rich-text-wrapper flex flex-col', className)}>
      <style>{`
        .rich-text-wrapper .ProseMirror * {
          color: inherit !important;
        }
        .rich-text-wrapper .ProseMirror {
          color: hsl(var(--foreground));
        }
        .rich-text-wrapper .ProseMirror a {
          color: hsl(var(--primary)) !important;
        }
        .rich-text-wrapper .editor-content-scrollable {
          overflow-y: auto;
          flex: 1;
        }
      `}</style>
      {editable && <MenuBar editor={editor} showFeedbackButton={showFeedbackButton} onFeedbackClick={onFeedbackClick} showRawHtmlButton={showRawHtmlButton} isRawView={isRawView} onRawViewToggle={onRawViewToggle} />}
      <div className="editor-content-scrollable">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

