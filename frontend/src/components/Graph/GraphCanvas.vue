<template>
  <div class="graph-canvas-container" ref="containerRef">
    <canvas ref="canvasRef" v-show="useCanvas"></canvas>
    <svg ref="svgRef" v-show="!useCanvas"></svg>
    
    <div class="loading-overlay" v-if="graphStore.isLoading">
      <div class="loading-spinner"></div>
      <div>加载中...</div>
    </div>
    
    <div class="empty-overlay" v-if="!graphStore.isLoading && graphStore.nodes.length === 0">
      <div class="empty-icon">📭</div>
      <div class="empty-title">暂无图谱数据</div>
      <div class="empty-desc">请导入Markdown文件或创建笔记</div>
    </div>
    
    <div class="load-more-hint" v-if="graphStore.hasMore" @click="loadMore">
      加载更多 ({{ graphStore.nodes.length }}/{{ graphStore.totalNodes }})
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import { useGraphStore } from '../../stores/graph'

const graphStore = useGraphStore()
const containerRef = ref(null)
const canvasRef = ref(null)
const svgRef = ref(null)

const useCanvas = ref(false)
let simulation = null
let zoom = null
let transform = d3.zoomIdentity
let animationFrameId = null

const COMMUNITY_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1', 
  '#14b8a6', '#f97316'
]

const TYPE_COLORS = {
  default: '#64748b',
  note: '#3b82f6',
  concept: '#ef4444',
  reference: '#10b981',
  idea: '#f59e0b',
  error: '#dc2626'
}

function getNodeColor(node) {
  if (node.community_id != null) {
    return COMMUNITY_COLORS[node.community_id % COMMUNITY_COLORS.length]
  }
  return TYPE_COLORS[node.type] || TYPE_COLORS.default
}

function getNodeRadius(node) {
  return 18 + Math.min((node.degree || 0) * 4, 25)
}

function getLinkWidth(link) {
  return 1 + Math.min((link.weight || 1) * 0.5, 4)
}

function isInViewport(x, y, width, height) {
  const padding = 50
  return x > -padding && x < width + padding && y > -padding && y < height + padding
}

function setupGraph() {
  if (!containerRef.value) return
  
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  useCanvas.value = graphStore.nodes.length > 300

  if (useCanvas.value) {
    d3.select(svgRef.value).style('display', 'none')
    d3.select(canvasRef.value)
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block')
  } else {
    d3.select(canvasRef.value).style('display', 'none')
    d3.select(svgRef.value).remove()
    const svg = d3.select(containerRef.value)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .style('display', 'block')
    svgRef.value = svg.node()
  }

  zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', zoomed)

  if (useCanvas.value) {
    d3.select(canvasRef.value).call(zoom)
  } else {
    d3.select(svgRef.value).call(zoom)
  }

  transform = d3.zoomIdentity

  simulation = d3.forceSimulation(graphStore.nodes)
    .force('link', d3.forceLink(graphStore.links).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-350))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(d => getNodeRadius(d) + 8))

  if (!useCanvas.value) {
    renderSVG(width, height)
  } else {
    simulation.on('tick', () => canvasTick(width, height))
  }
}

function renderSVG(width, height) {
  const svg = d3.select(svgRef.value)
  svg.selectAll('g').remove()
  
  const g = svg.append('g')

  const link = g.append('g')
    .selectAll('line')
    .data(graphStore.links)
    .join('line')
    .attr('class', 'link')
    .attr('stroke', '#64748b')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', d => getLinkWidth(d))

  const node = g.append('g')
    .selectAll('g')
    .data(graphStore.nodes)
    .join('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

  node.append('circle')
    .attr('r', d => getNodeRadius(d))
    .attr('fill', d => getNodeColor(d))
    .attr('stroke', '#1e293b')
    .attr('stroke-width', 2)

  node.append('text')
    .attr('dy', d => getNodeRadius(d) + 14)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '500')
    .style('fill', '#f1f5f9')
    .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
    .text(d => truncate(d.title, 10))

  node.on('mouseover', function(event, d) {
    d3.select(this).select('circle').attr('stroke-width', 3)
    showTooltip(event, d)
  })
  .on('mouseout', function(event, d) {
    d3.select(this).select('circle').attr('stroke-width', 2)
    hideTooltip()
  })
  .on('click', function(event, d) {
    graphStore.selectNode(d)
  })
  .on('dblclick', function(event, d) {
    event.stopPropagation()
    expandNeighborhood(d.id)
  })

  simulation.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
    node.attr('transform', d => `translate(${d.x},${d.y})`)
  })
}

function canvasTick(width, height) {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx || !canvasRef.value) return

  ctx.clearRect(0, 0, width, height)

  const scale = transform.k
  const offsetX = transform.x
  const offsetY = transform.y

  graphStore.links.forEach(link => {
    const sourceX = link.source.x * scale + offsetX
    const sourceY = link.source.y * scale + offsetY
    const targetX = link.target.x * scale + offsetX
    const targetY = link.target.y * scale + offsetY

    if (isInViewport(sourceX, sourceY, width, height) || isInViewport(targetX, targetY, width, height)) {
      ctx.beginPath()
      ctx.moveTo(sourceX, sourceY)
      ctx.lineTo(targetX, targetY)
      ctx.strokeStyle = '#64748b'
      ctx.globalAlpha = 0.3
      ctx.lineWidth = getLinkWidth(link) * scale
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  })

  graphStore.nodes.forEach(node => {
    const x = node.x * scale + offsetX
    const y = node.y * scale + offsetY

    if (!isInViewport(x, y, width, height)) return

    const radius = getNodeRadius(node) * scale
    const color = getNodeColor(node)

    ctx.shadowColor = color
    ctx.shadowBlur = 8 * scale
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.strokeStyle = graphStore.selectedNode?.id === node.id ? '#ef4444' : '#1e293b'
    ctx.lineWidth = graphStore.selectedNode?.id === node.id ? 3 * scale : 2 * scale
    ctx.stroke()

    if (scale > 0.5) {
      ctx.font = `${Math.max(10, 11 * scale)}px sans-serif`
      ctx.fillStyle = '#f1f5f9'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(truncate(node.title, 10), x, y + radius + 12 * scale)
    }
  })

  animationFrameId = requestAnimationFrame(() => canvasTick(width, height))
}

function zoomed(event) {
  transform = event.transform
  if (!useCanvas.value && svgRef.value) {
    d3.select(svgRef.value).select('g').attr('transform', transform)
  }
}

function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart()
  d.fx = d.x
  d.fy = d.y
}

function dragged(event, d) {
  d.fx = event.x
  d.fy = event.y
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0)
  d.fx = null
  d.fy = null
}

function showTooltip(event, d) {
  const tooltip = document.getElementById('global-tooltip')
  if (!tooltip) return
  
  tooltip.style.display = 'block'
  tooltip.style.left = (event.pageX + 15) + 'px'
  tooltip.style.top = (event.pageY + 15) + 'px'
  tooltip.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px; color: #f1f5f9;">${escapeHtml(d.title)}</div>
    <div style="color: #94a3b8; font-size: 12px;">关联度: ${d.degree || 0}</div>
    <div style="color: #64748b; font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155;">
      社区ID: ${d.community_id || '未分配'}
    </div>
  `
}

function hideTooltip() {
  const tooltip = document.getElementById('global-tooltip')
  if (tooltip) tooltip.style.display = 'none'
}

function truncate(text, length) {
  return text.length > length ? text.substring(0, length) + '...' : text
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function expandNeighborhood(nodeId) {
  try {
    const data = await useGraphStore().expand.neighborhood(nodeId, 1)
    const graphStore = useGraphStore()
    const existingIds = new Set(graphStore.nodes.map(n => n.id))
    
    data.nodes.forEach(node => {
      if (!existingIds.has(node.id)) {
        graphStore.nodes.push({
          ...node,
          x: graphStore.nodes.find(n => n.id === data.center_id)?.x || window.innerWidth / 2,
          y: graphStore.nodes.find(n => n.id === data.center_id)?.y || window.innerHeight / 2
        })
      }
    })
    
    data.links.forEach(link => {
      const existingLink = graphStore.links.find(
        l => l.source === link.source && l.target === link.target
      )
      if (!existingLink) {
        graphStore.links.push(link)
      }
    })
    
    nextTick(() => setupGraph())
    showToast(`展开成功，新增 ${data.nodes.length - 1} 个节点`, 'success')
  } catch (error) {
    showToast('展开失败: ' + error.message, 'error')
  }
}

async function loadMore() {
  await graphStore.loadMoreNodes()
  nextTick(() => setupGraph())
}

function showToast(message, type = 'info') {
  const event = new CustomEvent('show-toast', { detail: { message, type } })
  window.dispatchEvent(event)
}

function handleResetZoom() {
  const width = containerRef.value?.clientWidth || 800
  const height = containerRef.value?.clientHeight || 600
  const targetTransform = d3.zoomIdentity.translate(width / 2, height / 2)
  
  if (useCanvas.value) {
    d3.select(canvasRef.value)
      .transition().duration(750)
      .call(zoom.transform, targetTransform)
  } else {
    d3.select(svgRef.value)
      .transition().duration(750)
      .call(zoom.transform, targetTransform)
  }
}

watch(() => graphStore.nodes.length, () => {
  nextTick(() => setupGraph())
})

onMounted(() => {
  graphStore.fetchGraph()
  window.addEventListener('reset-zoom', handleResetZoom)
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  window.removeEventListener('reset-zoom', handleResetZoom)
})
</script>

<style scoped>
.graph-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #0f172a;
}

canvas, svg {
  display: block;
  width: 100%;
  height: 100%;
}

.loading-overlay, .empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.8);
  z-index: 10;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #1e293b;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  margin-bottom: 8px;
  color: #94a3b8;
}

.empty-desc {
  font-size: 14px;
  color: #64748b;
}

.load-more-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #334155;
  border-radius: 20px;
  padding: 10px 20px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  z-index: 10;
}

.load-more-hint:hover {
  background: #1e293b;
}
</style>
