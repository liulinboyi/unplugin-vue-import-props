<script lang="ts" setup>
import Test, { foo } from './index1'
foo()
defineProps<{
  name: string
}>()
foo()
console.log('Hello')
</script>

<template>
  <div>
    <h1>Hello World</h1>
  </div>
</template>
