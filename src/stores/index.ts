import { Tag, Resource, Link, Types, Comment, Article, Blog } from '../models'
import * as _ from 'lodash'
import Client from './client'
import {searchResource, deleteResource, updateTags, SearchQuery} from './general'

export class ResourceStore {
    client: Client
    index: string
    constructor(host:string, index: string, logLevel:string) {
        this.client = new Client(host, index, logLevel)
    }

    async init(): Promise<void> {
        await this.client.init()
    }

    async search(query: SearchQuery) {
        return await searchResource(this.client, query)
    }

    async deleteResource(id:string): Promise<boolean> {
        return await deleteResource(this.client, id)
    }

    async updateTags(resource: Resource):Promise<any> {
        return await updateTags(this.client, resource)
    }

    // async addLinks(links: Link[]): Promise<Map<string, boolean>> {
    //     _.sortBy(links, (o) => {return o.id})
    //     let data = _.flatten(_.map(links, (link) => {
    //         return [{create: {_index: this.index, _type: '_doc', '_id': link.id}}, {
    //             from: link.from,
    //             title: link.title,
    //             tags: tagsToStringArray(link.tags),
    //             fulltext: link.title,
    //             type: Types.Link,
    //             favicon: link.favicon,
    //             created: Date.now(),
    //         }]
    //     }))
    //     let res = await this.client.bulk({
    //         body: data
    //     })
    //     _.sortBy(res.items, (o) => {return o.create._id})
    //     return _.reduce(_.zip(links, res.items), (res, o): Map<string, boolean> => {
    //         let link = o[0]
    //         let item = o[1] as any
    //         res.set(link.from, item.create.result?true: false)
    //         return res
    //     }, new Map<string, boolean>())
    // }

    async addLink(link: Link): Promise<void> {
        let res = await this.client.upsert(link.id, {
            from: link.from,
            title: link.title,
            tags: tagsToStringArray(link.tags),
            fulltext: link.title,
            type: Types.Link,
            favicon: link.favicon,
            created: Date.now(),
            deleted: null
        })
        logger("add Link").debug(res)
    }

    async linkExist(link:Link): Promise<boolean> {
        try {
            let res = await this.client.get(link.id)
            if ((res._source as any).deleted) {
                logger("link exists: ").debug(false)        
                return false
            }
            logger("link exists: ").debug(true)
            return true
        } catch (e) {
            logger("link exists: ").debug(false)
            return false
        }
    }

    async addComment(comment:Comment):Promise<any> {
        let res = await this.client.create({
            content: comment.content,
            fulltext: comment.content,
            tags: tagsToStringArray(comment.tags),                
            type: "comment",
            created: Date.now()
        })
        logger("service addComment").debug(res)
    }

    async addArticle(article:Article): Promise<any> {
        let res = await this.client.create({
            title: article.title,
            content: article.content,
            fulltext: article.title + " " + article.content,
            tags: tagsToStringArray(article.tags),
            type: "article",
            created: Date.now()
        })
        logger("service addArticle").debug(res)
        return {id: res._id}
    }

    async updateArticle(article: Article): Promise<any> {
        let body = {
            title: article.title,
            content: article.content,
            fulltext: article.title + " " + article.content,
        }
        return await this.client.update(article.id, body)
    }
    
    async addBlog(blog:Blog): Promise<any> {
        let data = {
            title: blog.title,
            content: blog.content,
            fulltext: blog.title + " " + blog.fultext,
            from: blog.from,
            tags: tagsToStringArray(blog.tags),
            type: "blog",
            created: Date.now(),
        }
        let res = await this.client.upsert(blog.id, data)
        logger("Add blog").debug(JSON.stringify(res))
    }

    async backup() {
        return await this.client.backup()
    }

    async getBackups() {
        let res = await this.client.getBackups()
        return res.snapshots
    }

    async deleteBackup(id: string) {
        return await this.client.deleteBackup(id)
    }

    async restore(id: string) {
        return await this.client.restore(id)
    }
}

function tagsToStringArray(tags:Tag[]):string[] {
    return _.map(tags, (o)=> {return o.toString()})
}