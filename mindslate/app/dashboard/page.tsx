'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    if (!user) return
    const { data, error } = await supabase
      .from('documents')
      .insert({ title: 'Untitled', owner_id: user.id })
      .select()
      .single()

    if (data) window.location.href = `/editor/${data.id}`
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mindslate</h1>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={createDocument}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              + New document
            </button>
            <button
              onClick={signOut}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-1">No documents yet</p>
            <p className="text-sm">Click "New document" to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <a
                key={doc.id}
                href={`/editor/${doc.id}`}
                className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-400 transition-colors"
              >
                <p className="font-medium text-gray-900">{doc.title || 'Untitled'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}