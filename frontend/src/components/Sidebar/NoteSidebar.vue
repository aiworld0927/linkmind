<template>
  <div class="note-sidebar" :class="{ visible: isVisible }">
    <div class="sidebar-header">
      <div class="header-title">笔记详情</div>
      <button class="close-btn" @click="closeSidebar">✕</button>
    </div>
    
    <div class="sidebar-body" v-if="noteStore.currentNote">
      <div class="note-info">
        <div class="note-meta">
          <span class="meta-item">📅 {{ formatDate(noteStore.currentNote.created_at) }}</span>
          <span class="meta-item">🔗 关联度: {{ noteStore.currentNote.degree }}</span>
          <span class="meta-item" v-if="noteStore.currentNote.community_id != null">
            🏷️ 社区: {{ noteStore.currentNote.community_id }}
          </span>
        </div>
        
        <div class="note-type">
          <span class="type-badge" :style="{ background: getTypeColor(noteStore.currentNote.type) }">
            {{ getTypeName(noteStore.currentNote.type) }}
          </span>
        </div>
      </div>
      
      <div class="note-editor" v-if="noteStore.isEditing">
        <input 
          type="text" 
          v-model="noteStore.editTitle" 
          class="title-input"
          placeholder="笔记标题"
        />
        <textarea 
          v-model="noteStore.editContent" 
          class="content-textarea"
          placeholder="笔记内容（支持Markdown）"
        ></textarea>
        
        <div class="editor-actions">
          <button class="btn-secondary" @click="cancelEdit">取消</button>
          <button class="btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
      
      <div class="note-content" v-else>
        <h2 class="note-title">{{ noteStore.currentNote.title }}</h2>
        <div class="content-actions">
          <button class="action-btn" @click="editNote">✏️ 编辑</button>
          <button class="action-btn danger" @click="confirmDelete">🗑️ 删除</button>
        </div>
        
        <div class="markdown-content" v-html="renderedContent"></div>
        
        <div class="related-section" v-if="relatedNodes.length">
          <h4>关联节点</h4>
          <div class="related-list">
            <div 
              v-for="node in relatedNodes" 
              :key="node.id"
              class="related-item"
              @click="navigateToNode(node.id)"
            >
              <span class="related-title">{{ truncate(node.title, 15) }}</span>
              <span class="related-degree">{{ node.degree }} 关联</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="sidebar-empty" v-else>
      <div class="empty-icon">📝</div>
      <div class="empty-text">点击图谱中的节点查看详情</div>
    </div>
  </div>
  
  <div class="sidebar-overlay" :class="{ visible: isVisible }" @click="closeSidebar"></div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useNoteStore } from '../../stores/note'
import { useGraphStore } from '../../stores/graph'
import MarkdownIt from 'markdown-it'

const noteStore = useNoteStore()
const graphStore = useGraphStore()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const isVisible = computed(() => !!noteStore.currentNote)

const renderedContent = computed(() => {
  const content = noteStore.currentNote?.content || ''
  if (content.length > 500 && !noteStore.isEditing) {
    return md.render(content.substring(0, 500)) + '<p style="color:#64748b; font-size:12px;">... (内容已截断，点击编辑查看完整内容)</p>'
  }
  return md.render(content)
})

const relatedNodes = computed(() => {
  if (!noteStore.currentNote) return []
  
  const currentId = noteStore.currentNote.id
  const relatedIds = new Set()
  
  graphStore.links.forEach(link => {
    if (link.source === currentId) relatedIds.add(link.target)
    if (link.target === currentId) relatedIds.add(link.source)
  })
  
  return graphStore.nodes
    .filter(n => relatedIds.has(n.id))
    .slice(0, 5)
})

function formatDate(dateStr) {
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getTypeColor(type) {
  const colors = {
    default: '#64748b',
    note: '#3b82f6',
    concept: '#ef4444',
    reference: '#10b981',
    idea: '#f59e0b',
    error: '#dc2626'
  }
  return colors[type] || colors.default
}

function getTypeName(type) {
  const names = {
    default: '默认',
    note: '笔记',
    concept: '概念',
    reference: '参考',
    idea: '想法',
    error: '错题'
  }
  return names[type] || '默认'
}

function truncate(text, length) {
  return text.length > length ? text.substring(0, length) + '...' : text
}

function editNote() {
  noteStore.startEditing()
}

function cancelEdit() {
  noteStore.cancelEditing()
}

async function saveEdit() {
  try {
    await noteStore.saveNote()
    showToast('保存成功', 'success')
    graphStore.updateNode(noteStore.currentNote)
  } catch (error) {
    showToast('保存失败: ' + error.message, 'error')
  }
}

async function confirmDelete() {
  if (confirm('确定要删除这个笔记吗？')) {
    try {
      await noteStore.deleteNote()
      graphStore.deleteNode(noteStore.currentNote?.id)
      showToast('删除成功', 'success')
    } catch (error) {
      showToast('删除失败: ' + error.message, 'error')
    }
  }
}

function navigateToNode(nodeId) {
  const node = graphStore.nodes.find(n => n.id === nodeId)
  if (node) {
    graphStore.selectNode(node)
    noteStore.loadNote(nodeId)
    const event = new CustomEvent('locate-node', { detail: { node } })
    window.dispatchEvent(event)
  }
}

function closeSidebar() {
  noteStore.closeNote()
  graphStore.clearSelection()
}

function showToast(message, type = 'info') {
  const event = new CustomEvent('show-toast', { detail: { message, type } })
  window.dispatchEvent(event)
}

watch(() => graphStore.selectedNode, async (node) => {
  if (node) {
    await noteStore.loadNote(node.id)
  }
})
</script>

<style scoped>
.note-sidebar {
  width: 360px;
  background: rgba(15, 23, 42, 0.98);
  border-left: 1px solid #334155;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  transform: translateX(100%);
  z-index: 100;
  position: fixed;
  right: 0;
  top: 56px;
  height: calc(100vh - 56px);
  backdrop-filter: blur(8px);
}

.note-sidebar.visible {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #334155;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
}

.close-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
}

.close-btn:hover {
  color: #f1f5f9;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.note-info {
  margin-bottom: 16px;
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 12px;
  color: #64748b;
}

.note-type {
  margin-bottom: 16px;
}

.type-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: white;
}

.note-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title-input {
  padding: 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #f1f5f9;
  font-size: 16px;
  font-weight: 600;
}

.title-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.content-textarea {
  flex: 1;
  min-height: 300px;
  padding: 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #f1f5f9;
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
}

.content-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.editor-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #475569;
  color: #f1f5f9;
  cursor: pointer;
  font-size: 13px;
}

.btn-secondary:hover {
  background: #334155;
}

.note-content {
  display: flex;
  flex-direction: column;
}

.note-title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.content-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #1e293b;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #334155;
  color: #f1f5f9;
}

.action-btn.danger:hover {
  background: #ef4444;
  color: white;
}

.markdown-content {
  line-height: 1.7;
  color: #cbd5e1;
  margin-bottom: 20px;
}

.markdown-content :deep(h1) { font-size: 20px; font-weight: 700; color: #f1f5f9; margin: 16px 0 8px; padding-bottom: 8px; border-bottom: 1px solid #334155; }
.markdown-content :deep(h2) { font-size: 18px; font-weight: 600; color: #f1f5f9; margin: 14px 0 8px; }
.markdown-content :deep(h3) { font-size: 16px; font-weight: 600; color: #e2e8f0; margin: 12px 0 6px; }
.markdown-content :deep(h4) { font-size: 14px; font-weight: 600; color: #e2e8f0; margin: 10px 0 6px; }
.markdown-content :deep(p) { margin: 8px 0; }
.markdown-content :deep(ul), .markdown-content :deep(ol) { padding-left: 24px; margin: 8px 0; }
.markdown-content :deep(li) { margin: 4px 0; }
.markdown-content :deep(code) { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
.markdown-content :deep(pre) { background: #0f172a; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
.markdown-content :deep(pre code) { background: none; padding: 0; }
.markdown-content :deep(blockquote) { border-left: 3px solid #3b82f6; padding-left: 12px; margin: 8px 0; color: #64748b; }
.markdown-content :deep(a) { color: #3b82f6; text-decoration: none; }
.markdown-content :deep(a:hover) { text-decoration: underline; }

.related-section {
  padding-top: 16px;
  border-top: 1px solid #334155;
}

.related-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.related-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #1e293b;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.related-item:hover {
  background: #334155;
}

.related-title {
  font-size: 13px;
  color: #f1f5f9;
}

.related-degree {
  font-size: 11px;
  color: #64748b;
}

.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 99;
}

.sidebar-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}
</style>
