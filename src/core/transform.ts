import { MagicString } from '@vue/compiler-sfc'
import { DEFINE_PROPS_NAME } from './constants'
import {
  parseSFC,
} from './utils'
import type { TransformResult } from 'unplugin'

export const transform = (code: string, id: string, alias: { [x: string]: string }): TransformResult => {
  if (!code.includes(DEFINE_PROPS_NAME)) return

  const sfc = parseSFC(code, id, alias)
  if (!sfc) return
  if (!sfc.scriptSetup) return

  const { source } = sfc

  const s = new MagicString(source)
  // console.log(s.toString())

  return {
    code: s.toString(),
    get map() {
      return s.generateMap({
        source: id,
        includeContent: true,
      })
    },
  }
}
