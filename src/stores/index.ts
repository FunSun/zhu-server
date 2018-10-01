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

    search(query: string, tags:Tag[], facet: {[key:string]:any}): Resource[] {
        return null
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
}
