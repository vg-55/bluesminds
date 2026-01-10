// @ts-nocheck -- skip type checking
import * as d_docs_6 from "../content/docs/guides/setup-anthropic.mdx?collection=docs"
import * as d_docs_5 from "../content/docs/guides/models.mdx?collection=docs"
import * as d_docs_4 from "../content/docs/guides/anthropic.mdx?collection=docs"
import * as d_docs_3 from "../content/docs/api/chat.mdx?collection=docs"
import * as d_docs_2 from "../content/docs/quickstart.mdx?collection=docs"
import * as d_docs_1 from "../content/docs/index.mdx?collection=docs"
import * as d_docs_0 from "../content/docs/authentication.mdx?collection=docs"
import { _runtime } from "fumadocs-mdx/runtime/next"
import * as _source from "../source.config"
export const docs = _runtime.doc<typeof _source.docs>([{ info: {"path":"authentication.mdx","fullPath":"content/docs/authentication.mdx"}, data: d_docs_0 }, { info: {"path":"index.mdx","fullPath":"content/docs/index.mdx"}, data: d_docs_1 }, { info: {"path":"quickstart.mdx","fullPath":"content/docs/quickstart.mdx"}, data: d_docs_2 }, { info: {"path":"api/chat.mdx","fullPath":"content/docs/api/chat.mdx"}, data: d_docs_3 }, { info: {"path":"guides/anthropic.mdx","fullPath":"content/docs/guides/anthropic.mdx"}, data: d_docs_4 }, { info: {"path":"guides/models.mdx","fullPath":"content/docs/guides/models.mdx"}, data: d_docs_5 }, { info: {"path":"guides/setup-anthropic.mdx","fullPath":"content/docs/guides/setup-anthropic.mdx"}, data: d_docs_6 }]);
export const meta = _runtime.meta<typeof _source.meta>([{"info":{"path":"meta.json","fullPath":"content/docs/meta.json"},"data":{"title":"Documentation","pages":["index","quickstart","authentication"]}}, {"info":{"path":"api/meta.json","fullPath":"content/docs/api/meta.json"},"data":{"title":"API Reference","pages":["chat"]}}, {"info":{"path":"guides/meta.json","fullPath":"content/docs/guides/meta.json"},"data":{"title":"Guides","pages":["setup-anthropic","anthropic","models"]}}]);