import path, { dirname } from 'path'
import fs from 'fs'
import { parse } from '@vue/compiler-sfc'
import * as CompilerDOM from '@vue/compiler-dom'
import { parse as _parse } from '@babel/parser'
import { CodeGenerator } from '@babel/generator'
import { MagicString } from './magic-string'
import { DEFINE_PROPS_NAME } from './constants'
import type { ParserPlugin } from '@babel/parser'
import type {
  ElementNode,
  NodeTypes as _NodeTypes,
  TextModes as _TextModes,
} from '@vue/compiler-core'
import type { CompilerError } from '@vue/compiler-sfc'
import type {
  CallExpression,
  Declaration,
  ExportNamedDeclaration,
  Identifier,
  ImportDeclaration,
  ImportSpecifier,
  Node,
  Program,
  // removeComments,
  Statement,
  StringLiteral,
  TSInterfaceDeclaration,
  TSTypeAliasDeclaration,
} from '@babel/types'
import ts from "typescript";
import { fileURLToPath } from 'node:url'

const DEFINE_PROPS = 'defineProps'
const WITH_DEFAULTS = 'withDefaults'
const __dirname = dirname(fileURLToPath(import.meta.url))

export function isCallOf(
  node: Node | null | undefined,
  test: string | ((id: string) => boolean)
): node is CallExpression {
  return !!(
    node &&
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    (typeof test === 'string'
      ? node.callee.name === test
      : test(node.callee.name))
  )
}

export enum TextModes {
  DATA = 0,
  RCDATA = 1,
  RAWTEXT = 2,
  CDATA = 3,
  ATTRIBUTE_VALUE = 4,
}

export enum NodeTypes {
  ROOT = 0,
  ELEMENT = 1,
  TEXT = 2,
  COMMENT = 3,
  SIMPLE_EXPRESSION = 4,
  INTERPOLATION = 5,
  ATTRIBUTE = 6,
  DIRECTIVE = 7,
  COMPOUND_EXPRESSION = 8,
  IF = 9,
  IF_BRANCH = 10,
  FOR = 11,
  TEXT_CALL = 12,
  VNODE_CALL = 13,
  JS_CALL_EXPRESSION = 14,
  JS_OBJECT_EXPRESSION = 15,
  JS_PROPERTY = 16,
  JS_ARRAY_EXPRESSION = 17,
  JS_FUNCTION_EXPRESSION = 18,
  JS_CONDITIONAL_EXPRESSION = 19,
  JS_CACHE_EXPRESSION = 20,
  JS_BLOCK_STATEMENT = 21,
  JS_TEMPLATE_LITERAL = 22,
  JS_IF_STATEMENT = 23,
  JS_ASSIGNMENT_EXPRESSION = 24,
  JS_SEQUENCE_EXPRESSION = 25,
  JS_RETURN_STATEMENT = 26,
}

export interface ImportDeclarationInfo extends ImportDeclaration {
  source: StringLiteral & { curPath?: string; plugins?: ParserPlugin[] }
}

export function fileExists(path: string) {
  return fs.existsSync(path)
}

export function getFileContent(path: string) {
  return fs.readFileSync(path).toString()
}

export const decide = (n) => n.props.reduce((p, c) => {
  if (!p) return false
  if (['setup', 'lang'].includes(c.name)) {
    if (c.name === 'lang') {
      if (
        c.type ===
        (NodeTypes.ATTRIBUTE as unknown as _NodeTypes.ATTRIBUTE) &&
        c.value &&
        c.value.content === 'ts'
      ) {
        return true
      }
      return false
    }
    return true
  }
  return false
}, true)

export function parseSfc(code) {
  return CompilerDOM.parse(code, {
    // there are no components at SFC parsing level
    isNativeTag: () => true,
    // preserve all whitespaces
    isPreTag: () => true,
    getTextMode: ({ tag, props }, parent) => {
      // all top level elements except <template> are parsed as raw text
      // containers
      if (
        (!parent && tag !== 'template') ||
        // <template lang="xxx"> should also be treated as raw text
        (tag === 'template' &&
          props.some(
            (p) =>
              p.type ===
              (NodeTypes.ATTRIBUTE as unknown as _NodeTypes.ATTRIBUTE) &&
              p.name === 'lang' &&
              p.value &&
              p.value.content &&
              p.value.content !== 'html'
          ))
      ) {
        return TextModes.RAWTEXT as unknown as _TextModes.RAWTEXT
      } else {
        return TextModes.DATA as unknown as _TextModes.DATA
      }
    },
    onError: (e) => {
      errors.push(e)
    },
  })
}

export function traverseAst(ast) {
  const script: ElementNode[] = []
  ast.children.forEach((n) => {
    if (n.type !== (NodeTypes.ELEMENT as unknown as _NodeTypes.ELEMENT)) {
      return
    }

    if (
      n.type === (NodeTypes.ELEMENT as unknown as _NodeTypes.ELEMENT) &&
      n.tag === 'script' &&
      n.props.length === 2 &&
      decide(n)
    ) {
      script.push(n)
    }
  })
  return script
}

export function parseScript(scriptContent, plugins) {
  return _parse(scriptContent, {
    plugins,
    sourceType: 'module',
  }).program
}

export function getImportPropsTypeParametersTypeName(definedPropsTypeParametersNameNode) {
  if (definedPropsTypeParametersNameNode.type === 'TSTypeReference') {
    return (
      definedPropsTypeParametersNameNode.typeName as Identifier
    ).name
  } else {
    console.warn(`must be TSTypeReference`)
    return doNothing()
    // throw new Error(`must be TSTypeReference`)
  }
}

export function doNothing(code?, id?) {
  // const { descriptor } = parse(code, {
  //   filename: id,
  // })
  // return descriptor
  return
}

export function getRemoveTypeImportCode(copyImportNode) {
  let removeTypeImportCode
  if (copyImportNode.specifiers.length) {
    clearComment(copyImportNode)
    removeTypeImportCode = new CodeGenerator(copyImportNode as Node, {}).generate().code
  } else {
    removeTypeImportCode = ''
  }
  return removeTypeImportCode
}

export function removeTypeImport(node, code, removeTypeImportCode, scriptStart) {
  const s = new MagicString(code)
  s.overwrite(
    node.start + scriptStart,
    node.end + scriptStart,
    removeTypeImportCode
  )
  return s
}

export function getGap(node, removeTypeImportCode) {
  return node.end - node.start - removeTypeImportCode.length
}

export function addINterface(s, definePropsNodeStart, definePropsNodeEnd, scriptStart, gap, codes) {
  const ss = new MagicString(s.toString())
  ss.overwrite(definePropsNodeStart + scriptStart - gap, definePropsNodeEnd + scriptStart - gap, `${codes}`)
  return ss
}

function walkDeclaration(
  node: Declaration
) {
  let out = []
  if (node.type === 'VariableDeclaration') {
    const isConst = node.kind === 'const'
    // export const foo = ...
    for (const { id, init } of node.declarations) {
      const isDefineCall = !!(
        isConst &&
        isCallOf(
          init,
          c => c === DEFINE_PROPS || c === WITH_DEFAULTS
        )
      )
      // console.log(isDefineCall)
      if (isDefineCall) {
        out = [init]
        break
      }
    }
  }
  return out
}

function processWithDefaults(node: Node) {
  if (!isCallOf(node, WITH_DEFAULTS)) {
    return []
  }
  if (isCallOf(node.arguments[0], DEFINE_PROPS)) {
    return [node.arguments[0]]
  } else {
    // TODO
  }
}

function replaceAlias(cpath: string, alias) {
  // alias only support Object params array params is not support now.
  const entry = Object.keys(alias)
  if (entry.length) {
    for (let n of entry) {
      // n such as @foo , ~foo and so on
      // alias[n] is path
      if (cpath.startsWith(n)) {
        let tempPath = cpath.replace(n, '')
        cpath = path.resolve(alias[n], path.isAbsolute(tempPath) ? `.${tempPath}` : tempPath)
        break
      }
    }
  }
  return cpath
}

function getRootTypes(configPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // has no import type maybe config tsconfig.json's compilerOptions.typeRoots add global type
    if (configPath) {
      ts.sys.fileExists(configPath)
    } else {
      console.warn('the tsconfig.json not set')
      return doNothing()
      // configPath = ts.findConfigFile(
      //     /*searchPath*/ "./", ts.sys.fileExists, "tsconfig.json");
      // if (!configPath) {
      //   console.error("Could not find a valid 'tsconfig.json'.");
      //   return doNothing()
      // }
      // configPath = path.resolve(__dirname, configPath)
    }
    let config: string | { [x: string]: unknown } = fs.readFileSync(configPath).toString()
    try {
      config = JSON.parse(config)
    } catch (error) {
      console.error(config)
      return doNothing()
    }
    let cachePath = path.resolve(path.dirname(configPath), "./node_modules");
    // const cachePath = path.resolve(path.dirname(configPath), './node_modules/.unplugin-vue-import-props-cache.json')
    if (config['compilerOptions'] && config['compilerOptions']['typeRoots'] && config['compilerOptions']['typeRoots'].length) {
      // let temp = path.relative(cachePath, path.dirname(configPath))
      let temp = "../"
      const result = config['compilerOptions']['typeRoots'].map(n => {
        // let A = path.join(temp, n)
        // let B = path.resolve(temp, n)
        return path.normalize(`${temp}/${n}`)
      })
      config = {
        "compilerOptions": {
          "typeRoots": result,
        },
        "include": result,
        "exclude": []
      }
    }
    if (!fs.existsSync(cachePath)) {
      // mkdir(cachePath);
      fs.mkdirSync(path.dirname(cachePath))
    }
    cachePath = path.resolve(cachePath, './.unplugin-vue-import-props-cache.json')
    fs.writeFileSync(cachePath, JSON.stringify(config))

    type Assign = any & {onUnRecoverableConfigFileDiagnostic: any}
    // TODO
    let res = ts.getParsedCommandLineOfConfigFile(cachePath, {}, ts.createCompilerHost({}) as Assign)
    resolve(res.fileNames)
  })
}

/*
{
  type: "script",
  content: "\r\nimport { haha } from './index2'\r\ndefineProps<haha>()\r\nconsole.log('Hello')\r\n",
  loc: {
    source: "\r\nimport { haha } from './index2'\r\ndefineProps<haha>()\r\nconsole.log('Hello')\r\n",
    start: {
      column: 25,
      line: 1,
      offset: 24,
    },
    end: {
      column: 1,
      line: 5,
      offset: 102,
    },
  },
  attrs: {
    lang: "ts",
    setup: true,
  },
  lang: "ts",
  setup: true,
}
*/
export async function replaceCode(script, code, id, alias, configPath) {
  let afterReplace = ''
  if (script.type === 'script' && script.lang === 'ts' && script.setup) {
    // <script>'s offset
    const scriptStart = script.loc.start.offset
    const scriptContent = script.content
    const plugins: ParserPlugin[] = ['typescript']

    const scriptAst = parseScript(scriptContent, plugins)
    const body = scriptAst.body

    //  such as defineProps<Foo>()
    let definePropsNode = filterMarco(body as Statement[])
    if (!definePropsNode.length) {
      for (let node of body) {
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          definePropsNode = walkDeclaration(node.declaration)
          if (definePropsNode.length) {
            if (isCallOf(definePropsNode[0], WITH_DEFAULTS)) {
              definePropsNode = processWithDefaults(definePropsNode[0])
            }
            break
          }
        } else if (
          (node.type === 'VariableDeclaration' ||
            node.type === 'FunctionDeclaration' ||
            node.type === 'ClassDeclaration' ||
            node.type === 'TSEnumDeclaration') &&
          !node.declare
        ) {
          definePropsNode = walkDeclaration(node)
          if (definePropsNode.length) {
            if (isCallOf(definePropsNode[0], WITH_DEFAULTS)) {
              definePropsNode = processWithDefaults(definePropsNode[0])
            }
            break
          }
        }
      }
    } else {
      if (isCallOf(definePropsNode[0], WITH_DEFAULTS)) {
        definePropsNode = processWithDefaults(definePropsNode[0])
      }
    }

    if (!definePropsNode.length) {
      return doNothing()
    }
    if (definePropsNode.length > 1) {
      console.warn(`${DEFINE_PROPS_NAME} marco can only use one!`)
      return doNothing()
    }
    if (!definePropsNode[0].typeParameters || !definePropsNode[0].typeParameters.params || !definePropsNode[0].typeParameters.params.length) {
      return doNothing()
    }
    const definedPropsTypeParametersNameNode =
      definePropsNode[0].typeParameters.params[0]
    if (definedPropsTypeParametersNameNode.type !== 'TSTypeReference') {
      return doNothing()
    }
    // such as Foo
    let definedPropsTypeParametersName = getImportPropsTypeParametersTypeName(definedPropsTypeParametersNameNode)
    // start
    const definePropsNodeStart = definePropsNode[0].start
    const definePropsNodeEnd = definePropsNode[0].end
    const cpath = path.dirname(id)
    const imported = body.filter(
      (n) =>
        n.type === 'ImportDeclaration' &&
        n.specifiers.some(
          (p) => p.local.name === definedPropsTypeParametersName
        )
    )
    let rootTypes: string[]
    // in the definedProps<Foo>(), the Foo has one import like import { Foo } from './index'
    if (imported.length > 1) {
      console.warn(`in the definedProps<${definedPropsTypeParametersName}>(), ${definedPropsTypeParametersName} is double import!`)
      return doNothing()
      // throw new Error(
      //   `in the definedProps<${definedPropsTypeParametersName}>(), ${definedPropsTypeParametersName} is double import!`
      // )
    } else if (imported.length === 0) {
      // return doNothing()
      rootTypes = await getRootTypes(configPath)
      // console.log(rootTypes)
    }
    // has no import but has global type
    if (!imported.length && rootTypes) {
      try {
        /*
        rootTypes
        [
          "E:/开源/unplugin-vue-import-props/tests/types/index.d.ts",
        ]
      */
        // if the rootTypes file has export default type, all type in the file can't use as a global type
        let cache: Array<{
          path: string;
          hash: string;
          ast: Program;
        }> = []
        // filter delete file ast, after filter cache file path must be exist
        cache = cache.filter(n => rootTypes.includes(n.path))
        for (let n of rootTypes) {
          let content = getFileContent(n)
          let curCache = cache.filter(item => item.path === n)

          if (curCache.length) {
            // file content is change
            // update ast
            if (curCache[0].hash !== content) {
              const result = _parse(content, {
                plugins: [...(plugins ?? [])],
                sourceType: 'module',
              }).program
              curCache[0].hash = content
              curCache[0].ast = result
            }
          } else {
            // add file ast
            const result = _parse(content, {
              plugins: [...(plugins ?? [])],
              sourceType: 'module',
            }).program

            cache.push({
              path: n,
              hash: content,
              ast: result
            })
          }
        }
        // console.log(cache)
        for (let n of cache) {
          // if the global *.d.ts or *.ts has ExportNamedDeclaration or ExportDefaultDeclaration node, it can't as a global type
          if (n.ast.body.find(n => n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration')) {
            n.ast.body.length = 0
          }
          n.ast.body = n.ast.body.filter(n => n.type === 'TSInterfaceDeclaration' || (n.type === 'TSTypeAliasDeclaration' && n.typeAnnotation.type === 'TSTypeLiteral'))
          let sameIdName = n.ast.body.filter((n: TSInterfaceDeclaration | TSTypeAliasDeclaration) => n.id.name === definedPropsTypeParametersName)
          if (sameIdName.length) {
            if (sameIdName.length > 1) {
              console.warn(`don't support Subsequent property declarations`)
              console.warn(`不支持后续属性声明`)
              sameIdName = [sameIdName[0]]
            }
            let importNode = sameIdName[0]
            let importPropsTypeNode
            if (importNode.type === 'TSTypeAliasDeclaration'
              && importNode.typeAnnotation.type === 'TSTypeLiteral'
            ) {
              importPropsTypeNode = importNode.typeAnnotation
            } else {
              importPropsTypeNode = (importNode as TSInterfaceDeclaration).body
            }
            const definePropsLoc = {
              start: definePropsNode[0].typeParameters.params[0].start,
              end: definePropsNode[0].typeParameters.params[0].end
            }
            clearComment(importPropsTypeNode)
            let codes = new CodeGenerator(importPropsTypeNode, { minified: true }).generate().code
            const ss = addINterface(code, definePropsLoc.start, definePropsLoc.end, scriptStart, 0, codes)

            afterReplace = ss.toString()
            break;
          }
        }
        // console.log(cache)
      } catch (err: unknown) {
        const error = (err as Error)
        console.warn(`${error.message} ${error.stack} ${error.name}`)
        return doNothing()
      }
    } else {
      try {
        const node = imported[0]
        let rpath = ''
        if (
          (node as ImportDeclarationInfo).source.value && alias &&
          !Array.isArray(alias) /* alias only support Object params array params is not support now. */ &&
          Object.keys(alias).length
        ) {
          rpath = replaceAlias((node as ImportDeclarationInfo).source.value, alias)
        } else {
          rpath = path.resolve(
            cpath,
            (node as ImportDeclarationInfo).source.value
          )
        }

        let content
        if (fileExists(`${rpath}.ts`)) {
          content = getFileContent(`${rpath}.ts`)
        } else if (fileExists(`${rpath}.d.ts`)) {
          content = getFileContent(`${rpath}.d.ts`)
        } else {
          console.warn('The import file is not exit.')
          return doNothing()
          // throw new Error('The import file is not exit.')
        }
        const result = _parse(content, {
          plugins: [...(plugins ?? [])],
          sourceType: 'module',
        }).program
        /**
         * export interface Foo {
         *    name: string
         * }
         * 
         * Or
         * 
         * export default interface Foo {
         *    name: string
         * }
         */
        const exportNodes = result.body.filter(
          (n) => n.type === 'ExportNamedDeclaration' && n.exportKind === 'type' || n.type === 'ExportDefaultDeclaration' && n.exportKind === 'value' && (n.declaration as unknown as TSInterfaceDeclaration).type === 'TSInterfaceDeclaration'
        )

        // only find the ExportDefaultDeclaration node
        const exportDefault = result.body.filter(
          (n) => n.type === 'ExportDefaultDeclaration'
        )

        if (exportDefault.length > 1) {
          // if the export type is over 1, do't process it
          console.warn(`export default type must be one!`)
          return doNothing()
          // throw new Error(`export default must be one!`)
        }

        /**
         * interface Foo {
         * 
         * }
         * 
         * export default Foo
         */
        const exportDefaultIdentifier = result.body.filter(
          (n) => n.type === 'ExportDefaultDeclaration' && n.exportKind === 'value' && (n.declaration as unknown as Identifier).type === 'Identifier'
        )

        // import and local name are not equal, this means local name is unique so change
        // the type defined name to local name
        const copyImportNode: ImportDeclarationInfo = JSON.parse(JSON.stringify(node))
        const importTypeSpecifiers = copyImportNode.specifiers.filter(
          (p) => p.local.name === definedPropsTypeParametersName
        )[0]
        if (!importTypeSpecifiers) {
          return doNothing()
        }
        // such as import { Foo as Test} from './app
        // Foo is importedName
        // Text is LocalName
        const localName = importTypeSpecifiers.local.name
        let importedName = ''
        if (importTypeSpecifiers.type === 'ImportSpecifier') {
          if (importTypeSpecifiers.imported.type === 'Identifier') {
            importedName = importTypeSpecifiers.imported.name
          }
        }

        if (exportNodes.length === 0 && exportDefaultIdentifier.length === 1) {
          const exportDefaultIdentifierName = (exportDefaultIdentifier[0] as any).declaration.name
          const exportDefaultIdentifierValue = result.body.filter(n => n.type === 'TSInterfaceDeclaration' && n.id.name === exportDefaultIdentifierName)
          if (exportDefaultIdentifierValue.length) {
            /**
             * interface Foo {
             * }
             * interface Foo {
             * }
             * export default Foo
             * 
             * get the first one
             */
            if (exportDefaultIdentifierValue.length > 1) {
              console.warn(`don't support Subsequent property declarations, 不支持后续属性声明`)
            }
            (exportDefaultIdentifierValue[0] as TSInterfaceDeclaration).id.name = localName;
            exportNodes.push(JSON.parse(JSON.stringify(exportDefaultIdentifier[0])));
            (exportNodes[0] as any).declaration = exportDefaultIdentifierValue[0];
          }
        }

        let match = exportNodes.filter(
          n => importedName ?
            (((n as ExportNamedDeclaration).declaration) as any).id.name === importedName :
            (((n as ExportNamedDeclaration).declaration) as any).id.name === localName
        )

        if (match.length > 1) {
          console.warn(`don't support Subsequent property declarations`)
          console.warn(`不支持后续属性声明`)
          match = [match[0]]
        }
        if (match.length) {
          const importNode = match[0]

          if (copyImportNode.specifiers.length > 1) {
            copyImportNode.specifiers = copyImportNode.specifiers.filter(
              (p) => p.local.name !== definedPropsTypeParametersName
            )
          } else if (copyImportNode.specifiers.length === 1) {
            const specifier = copyImportNode.specifiers.find(
              (p) => p.local.name === definedPropsTypeParametersName
            );
            if ((specifier as ImportSpecifier).imported) {
              // if ('name' in ((specifier as ImportSpecifier).imported as Identifier)) {
              ((specifier as ImportSpecifier).imported as Identifier).name = ''
              specifier.local.name = ''
              // }
            } else {
              // such as import Foo from './app
              copyImportNode.specifiers = copyImportNode.specifiers.filter(
                (p) => p.local.name !== definedPropsTypeParametersName
              )
            }
          } else {
            console.warn('import error')
            return doNothing()
            // throw new Error('import error')
          }

          let importPropsTypeNode
          if (
            ((importNode.type === 'ExportNamedDeclaration' || importNode.type === 'ExportDefaultDeclaration') &&
              importNode.declaration &&
              (importNode.declaration.type === "TSInterfaceDeclaration" ||
                (importNode.declaration.type === 'TSTypeAliasDeclaration'
                  && importNode.declaration.typeAnnotation.type === 'TSTypeLiteral')
              )
            )
          ) {
            // importNode.declaration TSInterfaceDeclaration
            importNode.declaration.id.name = localName
            if (importNode.declaration.type === 'TSTypeAliasDeclaration'
              && importNode.declaration.typeAnnotation.type === 'TSTypeLiteral'
            ) {
              importPropsTypeNode = importNode.declaration.typeAnnotation
            } else {
              importPropsTypeNode = (importNode.declaration as TSInterfaceDeclaration).body
            }
          } else {
            // such as importNode.declaration.type is TSTypeAliasDeclaration
            return doNothing()
          }

          const removeTypeImportCode = getRemoveTypeImportCode(copyImportNode)
          const s = removeTypeImport(node, code, removeTypeImportCode, scriptStart)
          const gap = getGap(node, removeTypeImportCode)
          const definePropsLoc = {
            start: definePropsNode[0].typeParameters.params[0].start,
            end: definePropsNode[0].typeParameters.params[0].end
          }
          clearComment(importPropsTypeNode)
          let codes = new CodeGenerator(importPropsTypeNode, { minified: true }).generate().code
          const ss = addINterface(s, definePropsLoc.start, definePropsLoc.end, scriptStart, gap, codes)

          afterReplace = ss.toString()
        }
      } catch (err: unknown) {
        const error = (err as Error)
        console.warn(`${error.message} ${error.stack} ${error.name}`)
        return doNothing()
        // throw new Error(`${error.message} ${error.stack} ${error.name}`)
      }
    }
  }
  return afterReplace
}
const COMMENT_KEYS = ["leadingComments", "trailingComments", "innerComments"];
function clearComment(node) {
  // removeComments(node)
  COMMENT_KEYS.forEach(key => {
    node[key] = null;
  });
}

export const errors: (CompilerError | SyntaxError)[] = []
export const parseSFC = async (code: string, id: string, alias: { [x: string]: string }, configPath: string) => {
  const ast = parse(code, {
    filename: id,
  })
  const script = ast.descriptor.scriptSetup
  if (!script) {
    return doNothing()
  }

  let afterReplace = await replaceCode(script, code, id, alias, configPath)

  const { descriptor } = parse(afterReplace ? afterReplace : code, {
    filename: id,
  })

  return descriptor
}

export const filterMarco = (body: Statement[]) => {
  return body
    .map((raw: Node) => {
      let node = raw
      if (raw.type === 'ExpressionStatement') node = raw.expression
      return (isCallOf(node, DEFINE_PROPS_NAME) || isCallOf(node, WITH_DEFAULTS)) ? node : undefined
    })
    .filter((node) => !!node)
}
