import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Quote, Undo2, Redo2, Link as LinkIcon, Unlink,
} from 'lucide-react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  disabled?: boolean
}

/**
 * Rich text editor cho product description + blog content.
 * Output: HTML string. Lưu vào DB dạng text.
 */
export function TipTapEditor({
  value, onChange, placeholder = 'Nhập nội dung...',
  minHeight = 200, disabled = false,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // TipTap trả "<p></p>" khi rỗng — chuẩn hóa về ""
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: cn(
          'tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'px-3 py-2 [&_*]:my-1 [&_h2]:mt-3 [&_h3]:mt-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6'
        ),
      },
    },
  })

  // Sync khi value đổi từ ngoài (VD load edit)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value && value !== '') {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className={cn(
      'overflow-hidden rounded-md border bg-background',
      disabled && 'opacity-60'
    )}>
      <Toolbar editor={editor} />
      <div
        className="overflow-y-auto"
        style={{ minHeight: `${minHeight}px`, maxHeight: '500px' }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL:', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1">
      <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Đậm (Ctrl+B)">
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Nghiêng (Ctrl+I)">
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <Sep />
      <ToolBtn active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2">
        <Heading2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3">
        <Heading3 className="h-3.5 w-3.5" />
      </ToolBtn>
      <Sep />
      <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Trích dẫn">
        <Quote className="h-3.5 w-3.5" />
      </ToolBtn>
      <Sep />
      <ToolBtn active={editor.isActive('link')} onClick={setLink} title="Link">
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Bỏ link"
        disabled={!editor.isActive('link')}>
        <Unlink className="h-3.5 w-3.5" />
      </ToolBtn>
      <div className="ml-auto flex gap-0.5">
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)"
          disabled={!editor.can().undo()}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)"
          disabled={!editor.can().redo()}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>
    </div>
  )
}

function ToolBtn({
  active, onClick, title, disabled, children,
}: {
  active?: boolean; onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'grid h-7 w-7 place-items-center rounded transition',
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="mx-1 h-4 w-px bg-border" />
}
