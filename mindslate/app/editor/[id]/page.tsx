'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as Y from 'yjs'
import { BlockNoteEditor } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import '@blocknote/mantine/style.css'

export default function EditorPage() {
  const { id } = useParams()
  const [user, setUser] = useState<any>(null)
  const [title, setTitle] = useState('Untitled')
  const [loading, setLoading] = useState(true)
  const [doc] = useState(() => new Y.Doc())

  const editor = useCreateBlockNote({
    collaboration: {
      provider: null,
      fragment: doc.getXmlFragment('document-store'),
      user: {
        name: user?.email || 'Anonymous',
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      },
    },
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)

      const { data } = await supabase
        .from('documents')
        .select('title')
        .eq('id', id)
        .single()

      if (data) setTitle(data.title)
      setLoading(false)
    }
    load()
  }, [id])

  async function updateTitle(newTitle: string) {
    setTitle(newTitle)
    await supabase
      .from('documents')
      .update({ title: newTitle })
      .eq('id', id)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <a
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          &larr; Back
        </a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            alert('Link copied! Share it with a collaborator.')
          }}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Share
        </button>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => updateTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-4xl font-bold text-gray-900 border-none outline-none mb-8 placeholder-gray-300 bg-transparent"
        />

        {/* BlockNote editor */}
        <BlockNoteView
          editor={editor}
          theme="light"
        />
      </div>
    </div>
  )
}