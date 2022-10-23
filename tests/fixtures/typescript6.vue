<script lang="ts" setup>
import { Foo as Test } from './index2'
defineProps<Test>()
console.log('Hello')
</script>

<template>
  <div>
    <h1>Hello World</h1>
  </div>
</template>
