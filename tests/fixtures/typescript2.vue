<script lang="ts" setup>
import Test, { foo } from './index'
foo()
defineProps<Test>()
foo()
console.log('Hello')
</script>

<template>
  <div>
    <h1>Hello World</h1>
  </div>
</template>
