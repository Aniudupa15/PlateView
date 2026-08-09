declare module 'obj2gltf' {
  interface Obj2GltfOptions {
    binary?: boolean
    separate?: boolean
    separateTextures?: boolean
    checkTransparency?: boolean
    secure?: boolean
  }

  function obj2gltf(objPath: string, options?: Obj2GltfOptions): Promise<Buffer>

  export default obj2gltf
}
