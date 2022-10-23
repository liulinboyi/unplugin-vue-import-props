<script lang="ts" setup>
import { Foo, foo } from './index'
foo()
defineProps<Foo>()
foo()
console.log('Hello')
</script>

<template>
  <div>
    <h1>Hello World</h1>
  </div>
</template>
