import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTimelineStore = defineStore('timeline', () => {
  const timelineNodes = ref([])
  const dependencies = ref([])
  const isDragging = ref(false)
  const draggedNodeId = ref(null)

  function loadFromGraph(nodes, links) {
    timelineNodes.value = nodes.map((node, index) => ({
      ...node,
      order: index,
      position: index * 150 + 100
    })).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))

    dependencies.value = links.map(link => ({
      source: link.source,
      target: link.target,
      weight: link.weight || 1
    }))
  }

  function startDrag(nodeId) {
    isDragging.value = true
    draggedNodeId.value = nodeId
  }

  function endDrag() {
    isDragging.value = false
    draggedNodeId.value = null
  }

  function updatePosition(nodeId, position) {
    const node = timelineNodes.value.find(n => n.id === nodeId)
    if (node) {
      node.position = position
      reorderNodes()
    }
  }

  function reorderNodes() {
    timelineNodes.value.sort((a, b) => a.position - b.position)
    timelineNodes.value.forEach((node, index) => {
      node.order = index
    })
  }

  function getNodeByOrder(order) {
    return timelineNodes.value.find(n => n.order === order)
  }

  const orderedNodes = computed(() => {
    return [...timelineNodes.value].sort((a, b) => a.order - b.order)
  })

  return {
    timelineNodes,
    dependencies,
    isDragging,
    draggedNodeId,
    loadFromGraph,
    startDrag,
    endDrag,
    updatePosition,
    reorderNodes,
    getNodeByOrder,
    orderedNodes
  }
})
