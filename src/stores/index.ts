import { Tag, Resource, Link, Types, Comment, Article, Blog } from '../models'
import * as elasticsearch from 'elasticsearch'
import * as _ from 'lodash'

export interface SearchQuery {
    fulltext: string,
    tags: Tag[],
    offset: number,
    limit: number,
    facet: {[key:string]: any},
    magic: {[key:string]: any}
}

function randomScoreQ(q:any) {
    return {
        "function_score": {
            "query": q,
            "functions": [{
               "random_score": {
                    "seed": Date.now()
                }
            }]
        }
    }
}

function fulltextQ(q:string) {
    if (q === "") {
        return null
    }
    return {
        "must": { "match": {"fulltext": q}}
    }
}

function tagsQ(tags: Tag[]) {
    if (tags.length === 0) {
        return null
    }
    return {
        "must": {"terms": {"tags": _.map(tags, (o) => {return o.name})}}
    }
}

function facetsQ(facets:{[key:string]:any}) {
    let q:any[] = []
    let res = _.map(facets, (v, k) => {
        let inner:any
        if (k==='from') {
            inner = {"match": {"from": v}}
        }
        if (k==='t') {
            let type:string
            switch (v) {
                case 'c':
                type = "comment"
                break
                case 'a':
                type = "article"
                break
            }
            inner = {"term": {"type": type}}
        } else {
            inner = {"term": {[k]: v}}
        }
        return {"must":  inner}
    })
    q.push(...res)
    if (q.length === 0) {
        return null
    }
    return q
}

function notExistQ(field: string) {
    return {
        "must_not": {
            "exists": {
                "field": field
            }
        }
    }
}

function orderQ (field:string, asc:string) {
    return {[field]: {order: asc}}
}

function combineQ(...args: any[]):any {
    let flatten: any = []
    _.each(args, (arg) => {
        if (_.isNull(arg)) {
            return
        }
        if (_.isArray(arg) && arg.length === 0) {
            return
        }
        if (_.isArray(arg)) {
            flatten.push(...arg)
            return
        }
        flatten.push(arg)
    })
    let must: any[] = []
    let mustNot: any[] = []
    _.each(flatten, (o) => {
        if (o.must) {
            must.push(o.must)
        } else {
            mustNot.push(o.must_not)
        }
    })
    let bool:any = {}
    if (must.length>0) {
        bool["must"] = must
    }
    if (mustNot.length>0) {
        bool["must_not"] = mustNot
    }
    return {
        bool: bool
    }
}

function haveScore(q:any) {
    let serial = JSON.stringify(q)
    return _.includes(serial, '"match":') || _.includes(serial, '"function_score":')
}

function makeViews(data:any[]) {
    return _.map(data, (el) => {
        let {fulltext, ...view} = el._source as any
        view.id = el._id
        if (el.highlight && el.highlight.fulltext && el.highlight.fulltext.length > 0) {
            view.highlight = el.highlight.fulltext[0]
        }
        return view
    })
}

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

    async search(query: SearchQuery) {
        logger("search").debug(JSON.stringify(query))
        let q = combineQ(
            fulltextQ(query.fulltext),
            tagsQ(query.tags),
            facetsQ(query.facet),
            notExistQ("deleted")
        )    
        if (query.magic["random"]) {
            q = randomScoreQ(q)
        }
        let body:any = {
            "query": q,
            "highlight": {
                "fields": {
                    "fulltext": {}
                }
            },
            "from": query.offset,
            "size": query.limit,
        }
        if (!haveScore(q)) {
            body['sort'] =  orderQ('created', 'desc')
        }
        let result = await this.client.search({
            index: this.index,
            body: body
        })
        logger("search").debug(JSON.stringify(body))
        let views =  makeViews(result.hits.hits) 
        if (!query.magic['safe']) {
            views = _.filter(views, (view) => {
                return !_.includes(view.tags, 'NSFW')
            })
        }
        return views
    }

    async deleteResource(id:string): Promise<boolean> {
        await this.client.update({
            index: this.index,
            type: '_doc',
            id: id,
            body: {
              doc: {
                deleted: Date.now()
              }
            }
        })
        return true
    }

    async addLinks(links: Link[]): Promise<Map<string, boolean>> {
        _.sortBy(links, (o) => {return o.id})
        let data = _.flatten(_.map(links, (link) => {
            return [{create: {_index: this.index, _type: '_doc', '_id': link.id}}, {
                from: link.from,
                title: link.title,
                tags: tagsToStringArray(link.tags),
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

    async addLink(link: Link): Promise<void> {
        let res = await this.client.index({
            index: this.index,
            type: '_doc',
            id: link.id,
            body: {
                from: link.from,
                title: link.title,
                tags: tagsToStringArray(link.tags),
                fulltext: link.title,
                type: Types.Link,
                favicon: link.favicon,
                created: Date.now(),
                deleted: null
            }
        })
        logger("add Link").debug(res)
    }

    async linkExist(link:Link): Promise<boolean> {
        try {
            let res = await this.client.get({
                index: this.index,
                type: '_doc',
                id: link.id
            })
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

    async updateTags(resouce: Resource):Promise<any> {
        await this.client.update({
            index: this.index,
            type: '_doc',
            id: resouce.id,
            body: {
              doc: {
                tags: _.map(resouce.tags, (o)=> {return o.toString()}),
              }
            }
        })
    }

    async addComment(comment:Comment):Promise<any> {
        let res = await this.client.index({
            index: this.index,
            type: '_doc',
            body: {
                content: comment.content,
                fulltext: comment.content,
                tags: tagsToStringArray(comment.tags),                
                type: "comment",
                created: Date.now()
            }
        })
        logger("service addComment").debug(res)
    }

    async addArticle(article:Article): Promise<any> {
        let res = await this.client.index({
            index: this.index,
            type: '_doc',
            body: {
                title: article.title,
                content: article.content,
                fulltext: article.title + " " + article.content,
                tags: tagsToStringArray(article.tags),
                type: "article",
                created: Date.now()
            }
        })
        logger("service addArticle").debug(res)
    }

    async updateArticle(article: Article): Promise<any> {
        await this.client.update({
            index: this.index,
            type: '_doc',
            id: article.id,
            body: {
                doc: {
                    title: article.title,
                    content: article.content,
                    fulltext: article.title + " " + article.content,
                }
            }
        })
    }
    
    async addBlog(blog:Blog): Promise<any> {
        let res = await this.client.index({
            index: this.index,
            type: "_doc",
            id: blog.id,
            body: {
                title: blog.title,
                content: blog.content,
                fulltext: blog.title + " " + blog.fultext,
                from: blog.from,
                tags: tagsToStringArray(blog.tags),
                type: "blog",
                created: Date.now(),
            }
        })
        logger("Add blog").debug(JSON.stringify(res))
    }
}

function tagsToStringArray(tags:Tag[]):string[] {
    return _.map(tags, (o)=> {return o.toString()})
}