<template>
  <div id="global-tooltip" class="tooltip"></div>
</template>

<script setup>
</script>

<style scoped>
.tooltip {
  position: fixed;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 1000;
  max-width: 280px;
  display: none;
  backdrop-filter: blur(8px);
}
</style>
