declare module 'smiles-drawer' {
  type ParseSuccess = (tree: any) => void;
  type ParseError = (error: unknown) => void;

  class Drawer {
    constructor(options?: Record<string, unknown>);
    draw(tree: any, target: HTMLCanvasElement | string, themeName?: string, infoOnly?: boolean): void;
  }

  const SmilesDrawer: {
    Drawer: typeof Drawer;
    parse(smiles: string, successCallback?: ParseSuccess, errorCallback?: ParseError): void;
  };

  export default SmilesDrawer;
}
