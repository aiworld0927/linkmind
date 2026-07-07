<template>
  <div class="timeline-container">
    <div class="timeline-header">
      <div class="header-info">
        <span class="timeline-count">共 {{ timelineStore.orderedNodes.length }} 个节点</span>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="saveTimeline">💾 保存时序</button>
      </div>
    </div>
    
    <div class="timeline-body" ref="timelineBody">
      <div class="timeline-axis">
        <div class="axis-line"></div>
        <div class="axis-labels">
          <div 
            v-for="i in 10" 
            :key="i" 
            class="axis-label"
            :style="{ left: `${i * 10}%` }"
          >
            {{ i }}
          </div>
        </div>
      </div>
      
      <div class="timeline-track">
        <div 
          v-for="node in timelineStore.orderedNodes" 
          :key="node.id"
          class="timeline-node"
          :class="{ dragging: timelineStore.draggedNodeId === node.id }"
          :style="{ left: `${(node.order / Math.max(timelineStore.orderedNodes.length - 1, 1)) * 100}%` }"
          @mousedown="startDrag(node.id)"
          @click="selectNode(node)"
        >
          <div class="node-dot" :style="{ background: getNodeColor(node) }"></div>
          <div class="node-title">{{ truncate(node.title, 12) }}</div>
          <div class="node-order">{{ node.order + 1 }}</div>
        </div>
        
        <svg class="dependency-lines">
          <line 
            v-for="(dep, index) in visibleDependencies" 
            :key="index"
            :x1="getPosition(dep.source) + '%'"
            :y1="0"
            :x2="getPosition(dep.target) + '%'"
            :y2="20"
            stroke="#64748b"
            stroke-width="1.5"
            stroke-opacity="0.6"
            marker-end="url(#arrowhead)"
          />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>
        </svg>
      </div>
      
      <div class="timeline-labels">
        <div 
          v-for="node in timelineStore.orderedNodes" 
          :key="node.id"
          class="timeline-label"
          :style="{ left: `${(node.order / Math.max(timelineStore.orderedNodes.length - 1, 1)) * 100}%` }"
        >
          <div class="label-title">{{ truncate(node.title, 15) }}</div>
          <div class="label-date">{{ formatDate(node.created_at) }}</div>
        </div>
      </div>
    </div>
    
    <div class="timeline-footer">
      <div class="footer-info">
        💡 提示: 拖拽节点调整顺序，点击节点查看详情
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTimelineStore } from '../../stores/timeline'
import { useGraphStore } from '../../stores/graph'
import { useNoteStore } from '../../stores/note'

const timelineStore = useTimelineStore()
const graphStore = useGraphStore()
const noteStore = useNoteStore()

const timelineBody = ref(null)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartOrder = ref(0)

const COMMUNITY_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'
]

const visibleDependencies = computed(() => {
  const nodeIds = new Set(timelineStore.orderedNodes.map(n => n.id))
  return timelineStore.dependencies.filter(
    dep => nodeIds.has(dep.source) && nodeIds.has(dep.target)
  )
})

function getNodeColor(node) {
  if (node.community_id != null) {
    return COMMUNITY_COLORS[node.community_id % COMMUNITY_COLORS.length]
  }
  return '#64748b'
}

function getPosition(nodeId) {
  const node = timelineStore.orderedNodes.find(n => n.id === nodeId)
  if (!node) return 0
  return (node.order / Math.max(timelineStore.orderedNodes.length - 1, 1)) * 100
}

function truncate(text, length) {
  return text.length > length ? text.substring(0, length) + '...' : text
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function startDrag(nodeId) {
  const node = timelineStore.timelineNodes.find(n => n.id === nodeId)
  if (!node) return
  
  isDragging.value = true
  dragStartOrder.value = node.order
  timelineStore.startDrag(nodeId)
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
  if (!isDragging.value || !timelineStore.draggedNodeId) return
  
  const rect = timelineBody.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percentage = Math.max(0, Math.min(1, x / rect.width))
  
  const node = timelineStore.timelineNodes.find(n => n.id === timelineStore.draggedNodeId)
  if (node) {
    const totalNodes = timelineStore.orderedNodes.length
    const newOrder = Math.round(percentage * (totalNodes - 1))
    node.order = Math.max(0, Math.min(totalNodes - 1, newOrder))
    timelineStore.reorderNodes()
  }
}

function onMouseUp() {
  isDragging.value = false
  timelineStore.endDrag()
  
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

function selectNode(node) {
  if (isDragging.value) return
  
  graphStore.selectNode(node)
  noteStore.loadNote(node.id)
}

function saveTimeline() {
  showToast('时序顺序已保存', 'success')
}

function showToast(message, type = 'info') {
  const event = new CustomEvent('show-toast', { detail: { message, type } })
  window.dispatchEvent(event)
}

watch(() => graphStore.nodes, (nodes) => {
  if (nodes.length) {
    timelineStore.loadFromGraph(nodes, graphStore.links)
  }
}, { immediate: true })

onMounted(() => {
  timelineStore.loadFromGraph(graphStore.nodes, graphStore.links)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
.timeline-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #334155;
  background: rgba(15, 23, 42, 0.95);
}

.header-info {
  font-size: 14px;
  color: #64748b;
}

.timeline-count {
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.action-btn:hover {
  background: #2563eb;
}

.timeline-body {
  flex: 1;
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 40px 20px 20px;
}

.timeline-axis {
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 40px;
}

.axis-line {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: #334155;
}

.axis-labels {
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  height: 15px;
}

.axis-label {
  position: absolute;
  font-size: 11px;
  color: #64748b;
  transform: translateX(-50%);
}

.timeline-track {
  position: relative;
  height: 80px;
  background: rgba(30, 41, 59, 0.3);
  border-radius: 8px;
  padding: 20px 0;
  overflow: visible;
}

.timeline-node {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: grab;
  transition: all 0.1s ease;
  z-index: 10;
}

.timeline-node:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.timeline-node.dragging {
  cursor: grabbing;
  z-index: 100;
}

.node-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid #1e293b;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
}

.node-title {
  font-size: 11px;
  color: #f1f5f9;
  margin-top: 6px;
  white-space: nowrap;
}

.node-order {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}

.dependency-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 40px;
  pointer-events: none;
}

.timeline-labels {
  position: relative;
  margin-top: 20px;
  padding: 10px 0;
}

.timeline-label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.label-title {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-date {
  font-size: 10px;
  color: #64748b;
  margin-top: 4px;
}

.timeline-footer {
  padding: 12px 20px;
  border-top: 1px solid #334155;
  background: rgba(15, 23, 42, 0.95);
}

.footer-info {
  font-size: 12px;
  color: #64748b;
  text-align: center;
}
</style>
