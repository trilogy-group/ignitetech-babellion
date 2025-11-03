import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
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

export function RichTextEditor({
  content,
  onChange,
  onBlur,
  placeholder = 'Start typing...',
  editable = true,
  className,
  editorKey,
  showFeedbackButton = false,
  onFeedbackClick,
}: RichTextEditorProps) {
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
}

