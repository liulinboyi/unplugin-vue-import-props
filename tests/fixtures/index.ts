export interface Foo {
    name: string,
}

// don't support Subsequent property declarations
// 不支持后续属性声明
export interface Foo {
    age: number,
}

interface Hoo {
    name: string,
}

export function foo() {
    console.log('foo')
}

export default interface Test {
    age: number
}
