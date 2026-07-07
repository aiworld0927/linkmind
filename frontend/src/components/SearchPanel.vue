<template>
  <div class="search-panel">
    <div class="search-header">
      <h3>🔍 搜索</h3>
    </div>
    
    <div class="search-input-wrapper">
      <input 
        type="text" 
        v-model="searchKeyword" 
        placeholder="搜索笔记..."
        @keyup.enter="performSearch"
      />
      <button @click="performSearch">搜索</button>
    </div>
    
    <div class="search-results" v-if="searchResults.length">
      <div 
        v-for="result in searchResults" 
        :key="result.id"
        class="search-result-item"
        @click="locateNode(result.id)"
      >
        <div class="result-title">{{ truncate(result.title, 20) }}</div>
        <div class="result-meta">
          相关度: {{ result.score?.toFixed(2) || 'N/A' }} | 度数: {{ result.degree }}
        </div>
      </div>
    </div>
    
    <div class="search-empty" v-else-if="searchKeyword">
      未找到结果
    </div>
    
    <div class="filter-section">
      <h4>筛选</h4>
      <div class="filter-row">
        <label>类型:</label>
        <input type="text" v-model="filterType" placeholder="note, concept..." />
      </div>
      <div class="filter-row">
        <label>天数:</label>
        <input type="number" v-model="filterDays" placeholder="7" min="1" />
      </div>
      <div class="filter-row">
        <label>度数:</label>
        <input type="number" v-model="filterMinDegree" placeholder="最小" min="0" style="width: 50px;" />
        <input type="number" v-model="filterMaxDegree" placeholder="最大" min="0" style="width: 50px;" />
      </div>
      <button class="filter-btn" @click="applyFilters">应用筛选</button>
    </div>
    
    <div class="review-section">
      <h4>复盘</h4>
      <button class="review-btn" @click="loadErrorReview">❌ 错题复盘</button>
      <button class="review-btn" @click="loadHighWeightReview">⚖️ 高权重复盘</button>
      <button class="review-btn" @click="loadRecentReview">📅 近七日复盘</button>
      
      <div class="review-results" v-if="reviewResults.length">
        <div 
          v-for="result in reviewResults" 
          :key="result.id"
          class="review-item"
          @click="locateNode(result.id)"
        >
          {{ truncate(result.title, 20) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../services/api'
import { useGraphStore } from '../stores/graph'

const searchKeyword = ref('')
const searchResults = ref([])
const filterType = ref('')
const filterDays = ref('')
const filterMinDegree = ref('')
const filterMaxDegree = ref('')
const reviewResults = ref([])

const graphStore = useGraphStore()

async function performSearch() {
  if (!searchKeyword.value.trim()) return
  
  try {
    const data = await api.search.fulltext(searchKeyword.value.trim(), 20)
    searchResults.value = data.results || []
    if (searchResults.value.length) {
      graphStore.highlightNodes(searchResults.value.map(r => r.id))
    }
  } catch (error) {
    showToast('搜索失败: ' + error.message, 'error')
  }
}

async function applyFilters() {
  try {
    const params = {}
    if (filterType.value) params.type_filter = filterType.value
    if (filterDays.value) params.days_filter = filterDays.value
    if (filterMinDegree.value) params.min_degree = filterMinDegree.value
    if (filterMaxDegree.value) params.max_degree = filterMaxDegree.value
    
    const data = await api.search.filter(params)
    graphStore.nodes = data.nodes.map(n => ({
      ...n,
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100
    }))
    graphStore.links = data.links
    graphStore.clearHighlight()
    showToast(`筛选完成，共 ${data.nodes.length} 个节点`, 'success')
  } catch (error) {
    showToast('筛选失败: ' + error.message, 'error')
  }
}

async function loadErrorReview() {
  try {
    const data = await api.search.review.errors()
    reviewResults.value = data.results || []
    if (reviewResults.value.length) {
      graphStore.highlightNodes(reviewResults.value.map(r => r.id))
    }
  } catch (error) {
    showToast('加载失败', 'error')
  }
}

async function loadHighWeightReview() {
  try {
    const data = await api.search.review.highWeight(2.0)
    reviewResults.value = data.results || []
    if (reviewResults.value.length) {
      graphStore.highlightNodes(reviewResults.value.map(r => r.id))
    }
  } catch (error) {
    showToast('加载失败', 'error')
  }
}

async function loadRecentReview() {
  try {
    const data = await api.search.review.recent(7)
    reviewResults.value = data.results || []
    if (reviewResults.value.length) {
      graphStore.highlightNodes(reviewResults.value.map(r => r.id))
    }
  } catch (error) {
    showToast('加载失败', 'error')
  }
}

function locateNode(nodeId) {
  const node = graphStore.nodes.find(n => n.id === nodeId)
  if (node) {
    graphStore.selectNode(node)
    const event = new CustomEvent('locate-node', { detail: { node } })
    window.dispatchEvent(event)
  }
}

function truncate(text, length) {
  return text.length > length ? text.substring(0, length) + '...' : text
}

function showToast(message, type = 'info') {
  const event = new CustomEvent('show-toast', { detail: { message, type } })
  window.dispatchEvent(event)
}
</script>

<style scoped>
.search-panel {
  width: 280px;
  background: rgba(15, 23, 42, 0.95);
  border-right: 1px solid #334155;
  padding: 16px;
  overflow-y: auto;
  backdrop-filter: blur(8px);
}

.search-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.search-input-wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-input-wrapper input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #f1f5f9;
  font-size: 13px;
}

.search-input-wrapper input:focus {
  outline: none;
  border-color: #3b82f6;
}

.search-input-wrapper button {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.search-input-wrapper button:hover {
  background: #2563eb;
}

.search-results {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.search-result-item {
  padding: 10px;
  margin: 4px 0;
  background: #1e293b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.search-result-item:hover {
  background: #334155;
  transform: translateX(4px);
}

.result-title {
  font-weight: 500;
  color: #f1f5f9;
  margin-bottom: 4px;
}

.result-meta {
  font-size: 11px;
  color: #64748b;
}

.search-empty {
  color: #64748b;
  text-align: center;
  padding: 20px;
  font-size: 13px;
}

.filter-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #334155;
}

.filter-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.filter-row label {
  font-size: 11px;
  color: #64748b;
  min-width: 40px;
}

.filter-row input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #0f172a;
  color: #f1f5f9;
  font-size: 12px;
}

.filter-row input:focus {
  outline: none;
  border-color: #3b82f6;
}

.filter-btn {
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  background: #8b5cf6;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.filter-btn:hover {
  background: #7c3aed;
}

.review-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #334155;
}

.review-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.review-btn {
  display: block;
  width: 100%;
  padding: 9px;
  margin: 4px 0;
  border: none;
  border-radius: 8px;
  background: #06b6d4;
  color: #0f172a;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.review-btn:hover {
  background: #0891b2;
}

.review-results {
  max-height: 150px;
  overflow-y: auto;
  margin-top: 12px;
}

.review-item {
  padding: 8px;
  margin: 4px 0;
  background: #1e293b;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #f1f5f9;
  transition: background 0.2s;
}

.review-item:hover {
  background: #334155;
}
</style>
