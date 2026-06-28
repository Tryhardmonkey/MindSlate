'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)

      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      setDocuments(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function createDocument() {
    if (!user || creating) return
    setCreating(true)
    const { data } = await supabase
      .from('documents')
      .insert({ title: 'Untitled', owner_id: user.id })
      .select()
      .single()

    if (data) window.location.href = `/editor/${data.id}`
    setCreating(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function deleteDocument(e: React.MouseEvent, docId: string) {
    e.preventDefault() // stop the card link from firing
    e.stopPropagation()
    if (!confirm('Delete this page? This cannot be undone.')) return

    await supabase.from('documents').delete().eq('id', docId)
    setDocuments(prev => prev.filter(d => d.id !== docId))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5]">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  const initials = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex">

      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-[#f1f1ef] flex flex-col py-4 px-3 min-h-screen">
        {/* Workspace header */}
        <div className="flex items-center gap-2 px-2 py-1.5 mb-4">
          <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-white text-[11px] font-semibold">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-800 truncate">
            {user?.email?.split('@')[0]}
          </span>
        </div>

        {/* New page button */}
        <button
          onClick={createDocument}
          disabled={creating}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors w-full text-left mb-1 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {creating ? 'Creating...' : 'New page'}
        </button>

        <div className="mt-2 mb-1 px-2">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Pages</p>
        </div>

        {/* Document list in sidebar */}
        <nav className="flex-1 overflow-y-auto space-y-0.5">
          {documents.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-gray-400 italic">No pages yet</p>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="group flex items-center rounded-md hover:bg-gray-200 transition-colors">
                <a
                  key={doc.id}
                  href={`/editor/${doc.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors truncate">
                  <span className="text-gray-400 text-base leading-none">📄</span>
                  <span className="truncate">{doc.title || 'Untitled'}</span>
                </a>
                <button
                    onClick={(e) => deleteDocument(e, doc.id)}
                    className="opacity-0 group-hover:opacity-100 pr-2 text-gray-300 hover:text-red-400 transition-all"
                    title="Delete"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
              </div>
            ))
          )}
        </nav>

        {/* Sign out at bottom */}
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors mt-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Sign out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-16 py-16 overflow-y-auto">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Good to see you</h1>
          <p className="text-gray-400 text-sm mb-10">Pick up where you left off, or start something new.</p>

          {documents.length === 0 ? (
            <div
              onClick={createDocument}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-gray-400 hover:bg-white transition-all"
            >
              <p className="text-gray-400 text-sm mb-1">No pages yet</p>
              <p className="text-gray-500 text-sm font-medium">Click to create your first page →</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {documents.map(doc => (
                <a
                  key={doc.id}
                  href={`/editor/${doc.id}`}
                  className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <div className="text-2xl mb-3">📄</div>
                  <p className="font-medium text-gray-900 text-sm truncate group-hover:text-gray-700">
                    {doc.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(doc.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>

                  {/* Delete button — only visible on hover */}
                  <button
                    onClick={(e) => deleteDocument(e, doc.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                    title="Delete page"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </a>
              ))}

              {/* New page card */}
              <button
                onClick={createDocument}
                disabled={creating}
                className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-5 text-left hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-3">✏️</div>
                <p className="font-medium text-gray-400 text-sm">
                  {creating ? 'Creating...' : 'New page'}
                </p>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}