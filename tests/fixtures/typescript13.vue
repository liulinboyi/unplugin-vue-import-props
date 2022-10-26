<template>
  <div></div>
</template>

<script setup lang="ts">
import { Foo } from './index5'
// import { Foo as Test } from "./index5";
// import Test from './index5'
const props = defineProps<Foo>()
console.log(props)
</script>

<style lang="scss"></style>
