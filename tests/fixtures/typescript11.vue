<template>
  <div></div>
</template>

<script setup lang="ts">
import { Foo } from './index5'
const props = withDefaults(defineProps<Foo>(), {
  msg: () => 'hello',
  labels: () => ['one', 'two'],
})
console.log(props)
</script>

<style lang="scss"></style>
