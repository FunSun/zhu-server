import { Tag, Resource, Link, Types } from '../models'
import * as elasticsearch from 'elasticsearch'
import * as _ from 'lodash'

export class ResourceStore {
    client: elasticsearch.Client
    index: string
    constructor(host:string, index: string, logLevel:string) {
        this.client = new elasticsearch.Client({
            host: host,
            log: logLevel,
        })
        this.index = index
    }

    async search(query: string, tags:Tag[], facet: {[key:string]:any}, sort?: string): Promise<Resource[]> {
        console.log(query, tags, facet)

        let q:any[] = []
        if (query !== "") {
            let mainQ = { "match": {"fulltext": query}}    
            q.push(mainQ)
        }
        if (tags && tags.length > 0) {
            let tagQ = {"terms": {"tags": _.map(tags, (o) => {return o.name})}}
            q.push(tagQ)
        }
        if (facet && _.keys(facet).length > 0) {
            let facetQ = _.map(facet, (v, k) => {
                if (k==='from') {
                    return {"match": {"from": v}}
                }
                return {"term": {k: v}} 
            })
            q.push(...facetQ)
        }
        
        let result = await this.client.search({
            index: this.index,
            body: {
                "query": {
                    "bool": {
                        "must": q
                    }
                },
                "highlight": {
                    "fields": {
                        "fulltext": {}
                    }
                }
            }
        })
        return _.map(result.hits.hits, (el) => {
            let {fulltext, ...view} = el._source as any
            view.id = el._id
            if (el.highlight && el.highlight.fulltext && el.highlight.fulltext.length > 0) {
                view.highlight = el.highlight.fulltext[0]
            }
            return view
        })
    }

    async addLinks(links: Link[]): Promise<Map<string, boolean>> {
        _.sortBy(links, (o) => {return o.id})
        let data = _.flatten(_.map(links, (link) => {
            return [{create: {_index: this.index, _type: '_doc', '_id': link.id}}, {
                from: link.from,
                title: link.title,
                tags: _.map(link.tags, (o)=> {return o.toString()}),
                fulltext: link.title,
                type: Types.Link,
                favicon: link.favicon,
                created: Date.now(),
            }]
        }))
        let res = await this.client.bulk({
            body: data
        })
        _.sortBy(res.items, (o) => {return o.create._id})
        return _.reduce(_.zip(links, res.items), (res, o): Map<string, boolean> => {
            let link = o[0]
            let item = o[1] as any
            res.set(link.from, item.create.result?true: false)
            return res
        }, new Map<string, boolean>())
    }

    async linkExist(link:Link): Promise<boolean> {
        let res = await this.client.exists({
            index: this.index,
            type: '_doc',
            id: link.id
        })
        return res
    }
}
