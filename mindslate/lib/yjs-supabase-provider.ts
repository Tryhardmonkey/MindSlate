import * as Y from 'yjs'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'
import { SupabaseClient } from '@supabase/supabase-js'

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export class SimpleSupabaseProvider {
  doc: Y.Doc
  supabase: SupabaseClient
  documentId: string
  channel: any
  awareness: Awareness

  constructor(doc: Y.Doc, supabase: SupabaseClient, documentId: string) {
    this.doc = doc
    this.supabase = supabase
    this.documentId = documentId
    this.awareness = new Awareness(doc)

    this.channel = supabase.channel(`document-${documentId}`, {
      config: { broadcast: { self: false } },
    })

    // Document content updates
    this.channel.on('broadcast', { event: 'yjs-update' }, (payload: any) => {
      const update = base64ToUint8(payload.payload.update)
      Y.applyUpdate(this.doc, update, 'remote')
    })

    // Presence / awareness updates (cursors, online users)
    this.channel.on('broadcast', { event: 'awareness-update' }, (payload: any) => {
      const update = base64ToUint8(payload.payload.update)
      applyAwarenessUpdate(this.awareness, update, 'remote')
    })

    this.channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await this.loadInitialState()
      }
    })

    // Broadcast local document changes
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin === 'remote') return

      this.channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: uint8ToBase64(update) },
      })

      this.persistUpdate(update)
    })

    // Broadcast local awareness changes (cursor moves, presence)
    this.awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      if (origin === 'remote') return

      const changedClients = added.concat(updated).concat(removed)
      const update = encodeAwarenessUpdate(this.awareness, changedClients)

      this.channel.send({
        type: 'broadcast',
        event: 'awareness-update',
        payload: { update: uint8ToBase64(update) },
      })
    })

    // Clean up this client's awareness state when they close the tab
    window.addEventListener('beforeunload', () => {
      removeAwarenessStates(this.awareness, [doc.clientID], 'window unload')
    })
  }

  async loadInitialState() {
    const { data, error } = await this.supabase
      .from('document_updates')
      .select('update')
      .eq('document_id', this.documentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load document history:', error)
      return
    }

    if (data) {
      for (const row of data) {
        try {
          const update = base64ToUint8(row.update)
          Y.applyUpdate(this.doc, update, 'remote')
        } catch (e) {
          console.error('Skipping corrupted update:', e)
        }
      }
    }
  }

  async persistUpdate(update: Uint8Array) {
    await this.supabase.from('document_updates').insert({
      document_id: this.documentId,
      update: uint8ToBase64(update),
    })
  }

  destroy() {
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy')
    this.supabase.removeChannel(this.channel)
  }
}