declare module "dom-to-image-more" {
  interface Options {
    bgcolor?: string
    scale?: number
    width?: number
    height?: number
    style?: Partial<CSSStyleDeclaration>
    filter?: (node: Node) => boolean
  }
  const domtoimage: {
    toBlob(node: HTMLElement, options?: Options): Promise<Blob>
    toPng(node: HTMLElement, options?: Options): Promise<string>
    toJpeg(node: HTMLElement, options?: Options): Promise<string>
    toSvg(node: HTMLElement, options?: Options): Promise<string>
  }
  export default domtoimage
}
