import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export const useGraphStore = defineStore('graph', () => {
  const nodes = ref([])
  const links = ref([])
  const totalNodes = ref(0)
  const hasMore = ref(false)
  const selectedNode = ref(null)
  const highlightedNodes = ref(new Set())
  const highlightedLinks = ref(new Set())
  const isLoading = ref(false)

  const viewMode = ref('graph')

  async function fetchGraph(limit = 100) {
    isLoading.value = true
    try {
      const data = await api.graph.getFull(limit)
      nodes.value = data.nodes.map(n => ({
        ...n,
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100
      }))
      links.value = data.links
      totalNodes.value = data.total_nodes || nodes.value.length
      hasMore.value = data.has_more || false
      return data
    } catch (error) {
      console.error('Failed to fetch graph:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function loadMoreNodes() {
    const currentLimit = nodes.value.length + 100
    await fetchGraph(currentLimit)
  }

  function selectNode(node) {
    selectedNode.value = node
  }

  function clearSelection() {
    selectedNode.value = null
    highlightedNodes.value.clear()
    highlightedLinks.value.clear()
  }

  function highlightNodes(nodeIds) {
    highlightedNodes.value = new Set(nodeIds)
  }

  function highlightLinks(linkPairs) {
    highlightedLinks.value = new Set(linkPairs)
  }

  function clearHighlight() {
    highlightedNodes.value.clear()
    highlightedLinks.value.clear()
  }

  function updateNode(node) {
    const index = nodes.value.findIndex(n => n.id === node.id)
    if (index !== -1) {
      nodes.value[index] = { ...nodes.value[index], ...node }
      if (selectedNode.value?.id === node.id) {
        selectedNode.value = nodes.value[index]
      }
    }
  }

  function deleteNode(nodeId) {
    nodes.value = nodes.value.filter(n => n.id !== nodeId)
    links.value = links.value.filter(l => l.source !== nodeId && l.target !== nodeId)
    if (selectedNode.value?.id === nodeId) {
      selectedNode.value = null
    }
  }

  function setViewMode(mode) {
    viewMode.value = mode
  }

  const visibleNodes = computed(() => nodes.value)
  const visibleLinks = computed(() => links.value)

  return {
    nodes,
    links,
    totalNodes,
    hasMore,
    selectedNode,
    highlightedNodes,
    highlightedLinks,
    isLoading,
    viewMode,
    fetchGraph,
    loadMoreNodes,
    selectNode,
    clearSelection,
    highlightNodes,
    highlightLinks,
    clearHighlight,
    updateNode,
    deleteNode,
    setViewMode,
    visibleNodes,
    visibleLinks
  }
})
