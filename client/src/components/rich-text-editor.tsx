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
  MessageSquare
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
}

const MenuBar = ({ 
  editor, 
  showFeedbackButton, 
  onFeedbackClick 
}: { 
  editor: Editor | null;
  showFeedbackButton?: boolean;
  onFeedbackClick?: (selectedText: string) => void;
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
      // Tiptap's textContent positions map directly to document positions for text nodes
      const matches: Array<{ from: number; to: number }> = [];
      
      // Traverse the document to find the actual positions
      let textOffset = 0;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.isText) {
          const nodeText = node.text || '';
          const nodeLength = nodeText.length;
          
          // Check if any matches fall within this text node
          for (const textMatch of textMatches) {
            if (textMatch.index >= textOffset && textMatch.index < textOffset + nodeLength) {
              // Match starts in this node
              const from = pos + (textMatch.index - textOffset);
              const matchEndInText = textMatch.index + textMatch.length;
              
              if (matchEndInText <= textOffset + nodeLength) {
                // Match is entirely within this node
                const to = pos + (matchEndInText - textOffset);
                matches.push({ from, to });
              } else {
                // Match spans multiple nodes - approximate the end
                const to = Math.min(pos + nodeLength, pos + (textMatch.index - textOffset) + normalizedSearch.length);
                matches.push({ from, to });
              }
            }
          }
          
          textOffset += nodeLength;
        } else if (node.isBlock || node.type.name === 'hardBreak') {
          // Add space for block boundaries if needed
          // The textContent includes spaces/newlines, so we need to account for them
          if (textOffset < plainText.length && plainText[textOffset] === '\n') {
            textOffset += 1;
          }
        }
        
        return true;
      });
      
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
      
      // Escape special regex characters for literal matching
      const escapedSearch = normalizedOldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'gi');
      
      // Use Tiptap's textBetween to find matches by traversing document
      // Build accumulated text as we traverse to map positions correctly
      const matches: Array<{ from: number; to: number }> = [];
      let accumulatedText = '';
      
      // Traverse document and find matches
      editor.state.doc.descendants((node, pos) => {
        if (node.isText) {
          const nodeText = node.text || '';
          const textBeforeNode = accumulatedText;
          const textIncludingNode = accumulatedText + nodeText;
          
          // Search for matches that start in or overlap with this node
          searchRegex.lastIndex = 0;
          let match;
          
          // Search in the accumulated text (including this node)
          while ((match = searchRegex.exec(textIncludingNode)) !== null) {
            const matchStartInText = match.index;
            const matchEndInText = match.index + match[0].length;
            
            // Check if match starts in this node or before
            if (matchStartInText >= textBeforeNode.length && matchStartInText < textIncludingNode.length) {
              // Match starts in this node
              const from = pos + (matchStartInText - textBeforeNode.length);
              
              if (matchEndInText <= textIncludingNode.length) {
                // Match ends in this node
                const to = pos + (matchEndInText - textBeforeNode.length);
                matches.push({ from, to });
              } else {
                // Match spans beyond this node - find the end position
                let remainingLength = match[0].length - (textIncludingNode.length - matchStartInText);
                let currentDocPos = pos + nodeText.length;
                let currentTextPos = textIncludingNode.length;
                
                // Traverse forward to find end position
                editor.state.doc.descendants((endNode, endPos) => {
                  if (endPos < currentDocPos) return true;
                  if (remainingLength <= 0) return false;
                  
                  if (endNode.isText) {
                    const endNodeText = endNode.text || '';
                    const endNodeLength = endNodeText.length;
                    
                    if (remainingLength <= endNodeLength) {
                      const to = endPos + remainingLength;
                      matches.push({ from, to });
                      return false;
                    }
                    
                    remainingLength -= endNodeLength;
                    currentDocPos = endPos + endNodeLength;
                    currentTextPos += endNodeLength;
                  }
                  
                  return true;
                });
              }
            } else if (matchStartInText < textBeforeNode.length && matchEndInText > textBeforeNode.length) {
              // Match started in a previous node but continues into this node
              // Find the start position by traversing backwards
              let startFound = false;
              let startDocPos = -1;
              let searchTextPos = 0;
              
              editor.state.doc.descendants((startNode, startPos) => {
                if (startFound) return false;
                
                if (startNode.isText) {
                  const startNodeText = startNode.text || '';
                  const startNodeLength = startNodeText.length;
                  
                  if (searchTextPos + startNodeLength > matchStartInText) {
                    startDocPos = startPos + (matchStartInText - searchTextPos);
                    startFound = true;
                    
                    // Now find end position
                    const matchEnd = matchStartInText + match[0].length;
                    if (matchEnd <= textIncludingNode.length) {
                      const to = pos + (matchEnd - textBeforeNode.length);
                      matches.push({ from: startDocPos, to });
                    } else {
                      // End is in a future node - handled above
                    }
                    
                    return false;
                  }
                  
                  searchTextPos += startNodeLength;
                }
                
                return true;
              });
            }
          }
          
          accumulatedText = textIncludingNode;
        }
        
        return true;
      });
      
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
    <div className={cn('border rounded-md bg-background rich-text-wrapper', className)}>
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
      `}</style>
      {editable && <MenuBar editor={editor} showFeedbackButton={showFeedbackButton} onFeedbackClick={onFeedbackClick} />}
      <EditorContent editor={editor} />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

