<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <span class="logo-icon">🧠</span>
        <span class="logo-text">LinkMind</span>
      </div>
    </div>
    
    <div class="toolbar-center">
      <div class="view-switcher">
        <button 
          class="view-btn" 
          :class="{ active: viewMode === 'graph' }"
          @click="setViewMode('graph')"
        >
          📊 图谱视图
        </button>
        <button 
          class="view-btn" 
          :class="{ active: viewMode === 'timeline' }"
          @click="setViewMode('timeline')"
        >
          ⏱️ 时序视图
        </button>
      </div>
    </div>
    
    <div class="toolbar-right">
      <button class="toolbar-btn" @click="refreshGraph">🔄 刷新</button>
      <button class="toolbar-btn secondary" @click="resetZoom">📐 重置视图</button>
      <button class="toolbar-btn cluster-btn" @click="runClustering">🔮 重新聚类</button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useGraphStore } from '../stores/graph'
import { api } from '../services/api'

const viewMode = inject('viewMode')
const graphStore = useGraphStore()

function setViewMode(mode) {
  viewMode.value = mode
  graphStore.setViewMode(mode)
  
  if (mode === 'timeline') {
    const timelineStore = useTimelineStore()
    timelineStore.loadFromGraph(graphStore.nodes, graphStore.links)
  }
}

function refreshGraph() {
  graphStore.fetchGraph()
}

function resetZoom() {
  const event = new CustomEvent('reset-zoom')
  window.dispatchEvent(event)
}

async function runClustering() {
  try {
    await api.cluster.louvain()
    refreshGraph()
    showToast('聚类完成！', 'success')
  } catch (error) {
    showToast('聚类失败: ' + error.message, 'error')
  }
}

function showToast(message, type = 'info') {
  const event = new CustomEvent('show-toast', { detail: { message, type } })
  window.dispatchEvent(event)
}

import { useTimelineStore } from '../stores/timeline'
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid #334155;
  backdrop-filter: blur(8px);
  z-index: 100;
}

.toolbar-left {
  flex: 1;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
}

.toolbar-center {
  flex: 2;
  display: flex;
  justify-content: center;
}

.view-switcher {
  display: flex;
  background: #1e293b;
  border-radius: 8px;
  padding: 4px;
}

.view-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:hover {
  background: #334155;
  color: #f1f5f9;
}

.view-btn.active {
  background: #3b82f6;
  color: white;
}

.toolbar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.toolbar-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #2563eb;
}

.toolbar-btn.secondary {
  background: #475569;
}

.toolbar-btn.secondary:hover {
  background: #334155;
}

.toolbar-btn.cluster-btn {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
}

.toolbar-btn.cluster-btn:hover {
  background: linear-gradient(135deg, #7c3aed, #db2777);
}
</style>
