/* eslint-disable unicorn/prefer-string-replace-all */
import { resolve } from 'path'
import { rollup } from 'rollup'
import glob from 'fast-glob'
import VueImportProps from '../src/rollup'
import type { Plugin } from 'rollup'

const ToString: Plugin = {
  name: 'to-string',
  transform(code) {
    return `export default \`${code.replace(/`/g, '\\`')}\``
  },
}

async function getCode(file: string, plugins: Plugin[]) {
  const bundle = await rollup({
    input: [file],
    external: ['vue'],
    plugins,
  })
  const output = await bundle.generate({ format: 'esm' })
  return output.output
    .map((file) => {
      if (file.type === 'chunk') {
        return file.code
      } else {
        return file.fileName
      }
    })
    .join('\n')
}

describe('transform', () => {
  describe('fixtures', async () => {
    const root = resolve(__dirname, '..')
    const files = await glob('tests/fixtures/*.{vue,js,ts}', {
      cwd: root,
      onlyFiles: true,
    })

    // for (const file of files.filter((n) => n.endsWith('typescript-global.vue'))) {
    // for (const file of files.filter((n) => n.endsWith('14.vue'))) {
    for (const file of files.filter((n) => n.endsWith('vue'))) {
      it(file.replace(/\\/g, '/'), async () => {
        const filepath = resolve(root, file)

        const unpluginCode = await getCode(filepath, [
          VueImportProps({
            configPath: resolve(__dirname, './tsconfig.json')
          }),
          ToString,
        ]).catch((err) => err)
        expect(unpluginCode).toMatchSnapshot()
      })
    }
  })
})
