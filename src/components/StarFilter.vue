<script setup>
defineProps({ modelValue: { type: Boolean, default: false } })
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="star-filter">
    <input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />
    <svg width="14" height="14" viewBox="0 0 24 24" :fill="modelValue ? 'var(--star)' : 'none'" :stroke="modelValue ? 'none' : 'var(--text-tertiary)'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    <span>仅看高质量</span>
  </label>
</template>

<style scoped>
.star-filter {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.85rem; cursor: pointer; user-select: none;
  color: var(--text-secondary); font-family: var(--font-body);
}
.star-filter input { accent-color: var(--star); }
</style>
