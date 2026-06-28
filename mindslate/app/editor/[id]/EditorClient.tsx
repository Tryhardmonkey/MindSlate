'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as Y from 'yjs'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import { SimpleSupabaseProvider } from '@/lib/yjs-supabase-provider'
import '@blocknote/mantine/style.css'

function Editor({
  provider,
  doc,
  userName,
  userColor,
}: {
  provider: SimpleSupabaseProvider
  doc: Y.Doc
  userName: string
  userColor: string
}) {
  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment('document-store'),
      user: { name: userName, color: userColor },
    },
  })

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="min-h-[60vh]"
    />
  )
}

export default function EditorPage() {
  const { id } = useParams() as { id: string }
  const [title, setTitle] = useState('Untitled')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<{ name: string; color: string }[]>([])
  const [userName, setUserName] = useState('Anonymous')
  const [userColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16))
  const [copied, setCopied] = useState(false)

  const docRef = useRef<Y.Doc>(new Y.Doc())
  const providerRef = useRef<SimpleSupabaseProvider | null>(null)
  const [providerReady, setProviderReady] = useState(false)
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }

      setUserName(user.email || 'Anonymous')

      const { data } = await supabase
        .from('documents')
        .select('title')
        .eq('id', id)
        .single()

      if (data) setTitle(data.title)

      const doc = docRef.current
      const provider = new SimpleSupabaseProvider(doc, supabase, id)
      providerRef.current = provider

      provider.awareness.setLocalStateField('user', {
        name: user.email,
        color: userColor,
      })

      provider.awareness.on('change', () => {
        const states = Array.from(provider.awareness.getStates().values())
        const users = states.map((s: any) => s.user).filter(Boolean)
        setOnlineUsers(users)
      })

      setProviderReady(true)
      setLoading(false)
    }

    load()
    return () => { providerRef.current?.destroy() }
  }, [id])

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    setSaved(false)
    if (titleDebounce.current) clearTimeout(titleDebounce.current)
    titleDebounce.current = setTimeout(async () => {
      await supabase.from('documents').update({ title: newTitle }).eq('id', id)
      setSaved(true)
    }, 600)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex items-center gap-2 text-gray-300 text-sm">
        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Pages
          </a>
          <span className="text-gray-200">/</span>
          <span className="text-sm text-gray-600 truncate max-w-[200px]">{title || 'Untitled'}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Save status */}
          <span className="text-xs text-gray-300">
            {saved ? 'Saved' : 'Saving...'}
          </span>

          {/* Online avatars */}
          <div className="flex -space-x-1.5">
            {onlineUsers.map((u, i) => (
              <div
                key={i}
                title={u.name}
                className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: u.color }}
              >
                {u.name?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </header>

      {/* Document body */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-8 py-16">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full text-[2.5rem] font-bold text-gray-900 border-none outline-none mb-6 placeholder-gray-200 bg-transparent leading-tight"
        />

        {/* Editor */}
        {providerReady && providerRef.current && (
          <Editor
            provider={providerRef.current}
            doc={docRef.current}
            userName={userName}
            userColor={userColor}
          />
        )}
      </main>
    </div>
  )
}