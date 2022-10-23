interface Foo {
    gender: string
}

// don't support Subsequent property declarations
// 不支持后续属性声明
interface Foo {
    age: number
}

export default Foo

export function foo() {
    console.log('foo')
}
