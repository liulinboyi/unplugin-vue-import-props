import { MagicString } from '@vue/compiler-sfc'
import { DEFINE_PROPS_NAME } from './constants'
import {
  parseSFC,
} from './utils'
import type { TransformResult } from 'unplugin'

export const transform = async (code: string, id: string, alias: { [x: string]: string }, configPath: string): Promise<TransformResult> => {
  if (!code.includes(DEFINE_PROPS_NAME)) return

  const sfc = await parseSFC(code, id, alias, configPath)
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
