'use client'

import dynamic from 'next/dynamic'

const EditorClient = dynamic(() => import('./EditorClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Loading editor...
    </div>
  ),
})

export default function Page() {
  return <EditorClient />
}
