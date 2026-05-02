declare module 'powerbi-client' {
  export namespace service {
    class Service {
      constructor(hpmFactory: unknown, wpmpFactory: unknown, routerFactory: unknown);
      embed(element: HTMLElement, config: unknown): unknown;
    }
  }
  export namespace factories {
    const hpmFactory: unknown;
    const wpmpFactory: unknown;
    const routerFactory: unknown;
  }
}
