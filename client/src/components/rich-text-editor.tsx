import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from 'react';
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
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  parseHTML() {
    return [
      {
        tag: 'mark',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', { ...this.options.HTMLAttributes, ...HTMLAttributes, style: 'background-color: rgb(254 243 199); padding: 2px 0;' }, 0];
  },
  addCommands() {
    return {
      setHighlight: () => ({ commands }) => {
        return commands.setMark(this.name);
      },
      toggleHighlight: () => ({ commands }) => {
        return commands.toggleMark(this.name);
      },
      unsetHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});

export interface RichTextEditorRef {
  highlightText: (searchText: string) => void;
  clearHighlights: () => void;
  replaceText: (oldText: string, newText: string) => void;
  replaceHTML: (oldHTML: string, newHTML: string) => void;
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

  return (
    <div className="border-b border-border p-1.5 flex flex-wrap gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(editor.isActive('bold') && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(editor.isActive('italic') && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(editor.isActive('underline') && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(editor.isActive('heading', { level: 1 }) && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(editor.isActive('bulletList') && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(editor.isActive('orderedList') && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={cn(editor.isActive({ textAlign: 'left' }) && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={cn(editor.isActive({ textAlign: 'center' }) && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={cn(editor.isActive({ textAlign: 'right' }) && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addLink}
        className={cn(editor.isActive('link') && 'bg-accent', 'h-7 w-7 p-0')}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </Button>
      {showRawHtmlButton && (
        <>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRawViewToggle}
            className={cn(isRawView && 'bg-accent', 'h-7 w-7 p-0')}
            title={isRawView ? "Switch to Rich Text" : "Switch to Raw HTML"}
          >
            <Code className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      <div className="w-px h-5 bg-border mx-0.5" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="h-7 w-7 p-0"
      >
        <Undo className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="h-7 w-7 p-0"
      >
        <Redo className="h-3.5 w-3.5" />
      </Button>
      {showFeedbackButton && hasSelection && (
        <>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleFeedbackClick}
            className="h-7 px-2 bg-primary text-primary-foreground"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
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
    const isEmpty = currentContent === '<p></p>' || currentContent === '';
    const newIsEmpty = content === '<p></p>' || content === '' || !content;
    
    // Don't update if both are empty or if content is the same
    if ((isEmpty && newIsEmpty) || currentContent === content) {
      return;
    }
    
    // Update content
    editor.commands.setContent(content || '');
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
    highlightText: (searchText: string) => {
      if (!editor || !searchText) return;
      
      // Check if editor view is available
      if (!editor.view || !editor.state) {
        console.warn('Editor not fully initialized yet');
        return;
      }
      
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
      if (!normalizedSearch) return;
      
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
      
      if (textMatches.length === 0) return;
      
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
          return;
        }
        
        const { tr } = editor.state;
        matches.forEach(({ from, to }) => {
          // Validate positions
          if (from < to && from >= 0 && to <= editor.state.doc.content.size) {
            try {
              tr.addMark(from, to, editor.schema.marks.highlight.create());
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
    },
    
    clearHighlights: () => {
      if (!editor || !editor.view) return;
      
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
        // Check if editor view is available - wrap in try-catch as accessing view can throw
        if (!editor.view || !editor.state) {
          console.warn('Editor view not available yet');
          return;
        }
        
        // Get plain text content
        const plainText = editor.state.doc.textContent;
        
        // Find first occurrence (case-insensitive)
        const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const match = regex.exec(plainText);
        
        if (match) {
          const from = match.index;
          const to = match.index + match[0].length;
          
          // Set selection and scroll into view
          editor.commands.setTextSelection({ from, to });
          
          // Scroll to the selection using browser's built-in scrollIntoView
          setTimeout(() => {
            try {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const tempSpan = document.createElement('span');
                range.insertNode(tempSpan);
                tempSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                tempSpan.remove();
              }
            } catch (e) {
              // Ignore scroll errors
              console.warn('Could not scroll to text:', e);
            }
          }, 100);
        }
      } catch (error) {
        console.warn('scrollToText error:', error);
      }
    },
    replaceHTML: (oldHTML: string, newHTML: string) => {
      if (!editor || !oldHTML) return;
      
      // Get current HTML content
      const currentHTML = editor.getHTML();
      
      // Do a direct string replacement
      const updatedHTML = currentHTML.replace(oldHTML, newHTML);
      
      // Check if replacement happened
      if (updatedHTML === currentHTML) {
        console.warn('No replacement made - old HTML not found');
        return;
      }
      
      // Set the new HTML content (this will re-render the editor)
      editor.commands.setContent(updatedHTML);
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

