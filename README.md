# unplugin-vue-import-props

Add import define props type support for Vue script-setup and lang is typescript

## Usage

### Basic example

app.vue
```vue
<script setup lang="ts">
import { Test } from "./app";
defineProps<Test>();
</script>
```
app.ts
```typescript
export interface Test {
  name: string
}
```

<details>
<summary>Output</summary>

```vue
<script setup lang="ts">
import { } from "./app";
interface Test {
  name: string;
}
defineProps<Test>();
</script>
```

</details>

app.vue
```vue
<script setup lang="ts">
import { Foo as Test } from "./app";
defineProps<Test>();
</script>
```
app.ts
```typescript
export interface Foo {
  name: string
}
```

<details>
<summary>Output</summary>

```vue
<script setup lang="ts">
import { } from "./app";
interface Test {
  name: string;
}
defineProps<Test>();
</script>
```

</details>

## Installation

```bash
npm i unplugin-vue-import-props -D
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import ImportProps from 'unplugin-vue-import-props/vite'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [Vue(), ImportProps()],
})
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import ImportProps from 'unplugin-vue-import-props/rollup'

export default {
  plugins: [ImportProps()], // Must be before Vue plugin!
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from 'esbuild'

build({
  plugins: [
    require('unplugin-vue-import-props/esbuild')(), // Must be before Vue plugin!
  ],
})
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [require('unplugin-vue-import-props/webpack')()],
}
```

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [require('unplugin-vue-import-props/webpack')()],
  },
}
```

<br></details>

#### TypeScript Support

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    // ...
    "types": ["unplugin-vue-import-props" /* ... */]
  }
}
``` 

Plugin Template: [unplugin-vue-macros](https://github.com/sxzz/unplugin-vue-macros)

> With great appreciation to this project [unplugin-vue-macros](https://github.com/sxzz/unplugin-vue-macros) and its owners [三咲智子](https://github.com/sxzz) and [contributors](https://github.com/sxzz/unplugin-vue-macros/graphs/contributors), this project was created using this project as a template

