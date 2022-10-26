<template>
  <div></div>
</template>

<script setup lang="ts">
import { Foo } from './index4'
withDefaults(defineProps<Foo>(), {
  msg: () => 'hello',
  labels: () => ['one', 'two'],
})
</script>

<style lang="scss"></style>
