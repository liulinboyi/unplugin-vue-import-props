import { createUnplugin } from 'unplugin'
import { createFilter } from '@rollup/pluginutils'
import { transform } from './core/transform'
import type { FilterPattern } from '@rollup/pluginutils'

export interface Options {
  include?: FilterPattern
  exclude?: FilterPattern | undefined
}

export type OptionsResolved = Required<Options>

function resolveOption(options: Options): OptionsResolved {
  return {
    include: options.include || [/\.vue$/, /\.vue\?vue/],
    exclude: options.exclude || undefined,
  }
}

export default createUnplugin<Options>((options = {}) => {
  const opt = resolveOption(options)
  const filter = createFilter(opt.include, opt.exclude)
  /*
  {
    @: 'D:\\openSource\\demo\\src'
  }
  */
  let alias = {}

  const name = 'unplugin-vue-import-props'
  return {
    name,
    enforce: 'pre',

    transformInclude(id) {
      return filter(id)
    },

    config(config, { _command }) {
      alias = config.resolve.alias
    },

    transform(code, id) {
      try {
        return transform(code, id, alias)
      } catch (err: unknown) {
        this.error(`${name} ${err}`)
      }
    },
  }
})

export { transform }
