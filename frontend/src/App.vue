<template>
  <div class="app-container">
    <Toolbar />
    <div class="main-layout">
      <SearchPanel />
      <div class="canvas-wrapper">
        <GraphCanvas />
        <TimelineView v-if="viewMode === 'timeline'" />
      </div>
      <NoteSidebar />
    </div>
    <Toast />
    <Tooltip />
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import Toolbar from './components/Toolbar.vue'
import SearchPanel from './components/SearchPanel.vue'
import GraphCanvas from './components/Graph/GraphCanvas.vue'
import TimelineView from './components/Timeline/TimelineView.vue'
import NoteSidebar from './components/Sidebar/NoteSidebar.vue'
import Toast from './components/Common/Toast.vue'
import Tooltip from './components/Common/Tooltip.vue'

const viewMode = ref('graph')
provide('viewMode', viewMode)
</script>

<style>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #0f172a;
}

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
