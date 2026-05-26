// src/components/RichTextEditor.jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, X } from 'lucide-react';
import { useState, useCallback } from 'react';

// --- Link Popup ---
function LinkPopup({ onInsert, onClose }) {
  const [url, setUrl] = useState('https://');
  const [label, setLabel] = useState('');

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-md p-3 shadow-lg w-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-cream text-xs font-semibold">Insert Link</span>
        <button type="button" onClick={onClose} className="text-muted hover:text-cream">
          <X size={13} />
        </button>
      </div>
      <input
        autoFocus
        className="w-full bg-surface-raised border border-border rounded px-2 py-1.5 text-cream text-xs mb-2 outline-none focus:border-accent"
        placeholder="Label (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        className="w-full bg-surface-raised border border-border rounded px-2 py-1.5 text-cream text-xs mb-3 outline-none focus:border-accent"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onInsert(url, label)}
      />
      <button
        type="button"
        onClick={() => onInsert(url, label)}
        disabled={!url || url === 'https://'}
        className="w-full bg-accent text-navy text-xs font-semibold py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        Insert
      </button>
    </div>
  );
}

// --- Toolbar ---
function Toolbar({ editor }) {
  const [showLinkPopup, setShowLinkPopup] = useState(false);

  const insertLink = useCallback((url, label) => {
    if (!editor) return;
    if (label && editor.state.selection.empty) {
      editor.chain().focus().insertContent(label).run();
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    setShowLinkPopup(false);
  }, [editor]);

  if (!editor) return null;

  const btn = (active) =>
    `p-1.5 rounded transition-colors ${
      active ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-surface hover:text-cream'
    }`;

  return (
    <div className="relative flex items-center gap-1 px-2 py-1.5 border-b border-border bg-surface rounded-t-md">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        className={btn(editor.isActive('bold'))}
        title="Bold"
      >
        <Bold size={14} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        className={btn(editor.isActive('italic'))}
        title="Italic"
      >
        <Italic size={14} />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
        className={btn(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        <List size={14} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
        className={btn(editor.isActive('orderedList'))}
        title="Numbered List"
      >
        <ListOrdered size={14} />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run();
            } else {
              setShowLinkPopup((v) => !v);
            }
          }}
          className={btn(editor.isActive('link') || showLinkPopup)}
          title={editor.isActive('link') ? 'Remove link' : 'Insert link'}
        >
          <LinkIcon size={14} />
        </button>

        {showLinkPopup && (
          <LinkPopup
            onInsert={insertLink}
            onClose={() => setShowLinkPopup(false)}
          />
        )}
      </div>
    </div>
  );
}

// --- Main Component ---
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  className = '',
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false, // We'll use our own Link extension with custom options
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline cursor-pointer hover:opacity-80',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'min-h-[120px] focus:outline-none p-1 text-cream text-sm leading-relaxed',
        dir: 'ltr',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. switching quests)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  return (
    <div className={`rounded border border-border bg-surface-raised overflow-visible ${className}`}>
      <Toolbar editor={editor} />
      <div className="p-3 relative">
        {!value && !editor?.getText() && (
          <div className="absolute top-4 left-4 text-muted text-sm pointer-events-none">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}