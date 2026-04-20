/**
 * defineDocument — minimal static HTML document configuration.
 *
 * Used by defineApp to render the shell HTML at .listen() / .build() / .dev() time.
 * No dynamic meta merging (Phase 4 for SSR). No multi-document support.
 */

export interface DocumentMeta {
  title?: string
  description?: string
  [key: string]: string | undefined
}

export interface DocumentLink {
  rel: string
  href: string
  type?: string
  crossorigin?: 'anonymous' | 'use-credentials'
}

export interface DocumentScript {
  src?: string
  type?: 'module' | 'text/javascript'
  async?: boolean
  defer?: boolean
  content?: string
}

export interface DocumentHead {
  meta?: DocumentMeta
  links?: DocumentLink[]
  scripts?: DocumentScript[]
}

export interface DocumentBody {
  class?: string
}

export interface DocumentConfig {
  lang?: string
  head?: DocumentHead
  body?: DocumentBody
}

export interface DocumentDescriptor {
  readonly _tag: 'LiteForgeDocument'
  readonly config: DocumentConfig
}

export declare function defineDocument(config: DocumentConfig): DocumentDescriptor
