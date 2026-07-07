import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api'

export const useNoteStore = defineStore('note', () => {
  const currentNote = ref(null)
  const isEditing = ref(false)
  const editContent = ref('')
  const editTitle = ref('')

  async function loadNote(nodeId) {
    try {
      const note = await api.notes.get(nodeId)
      currentNote.value = note
      editTitle.value = note.title
      editContent.value = note.content || ''
      isEditing.value = false
      return note
    } catch (error) {
      console.error('Failed to load note:', error)
      throw error
    }
  }

  function startEditing() {
    if (currentNote.value) {
      editTitle.value = currentNote.value.title
      editContent.value = currentNote.value.content || ''
      isEditing.value = true
    }
  }

  function cancelEditing() {
    isEditing.value = false
    if (currentNote.value) {
      editTitle.value = currentNote.value.title
      editContent.value = currentNote.value.content || ''
    }
  }

  async function saveNote() {
    if (!currentNote.value) return

    try {
      const updated = await api.notes.update(currentNote.value.id, {
        title: editTitle.value,
        content: editContent.value
      })
      currentNote.value = updated
      isEditing.value = false
      return updated
    } catch (error) {
      console.error('Failed to save note:', error)
      throw error
    }
  }

  async function deleteNote() {
    if (!currentNote.value) return

    try {
      await api.notes.delete(currentNote.value.id)
      currentNote.value = null
      isEditing.value = false
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw error
    }
  }

  function closeNote() {
    currentNote.value = null
    isEditing.value = false
  }

  return {
    currentNote,
    isEditing,
    editContent,
    editTitle,
    loadNote,
    startEditing,
    cancelEditing,
    saveNote,
    deleteNote,
    closeNote
  }
})
