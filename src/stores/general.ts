import {Tag, Resource} from '../models'
import * as _ from 'lodash'
import Client from './client'

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

export async function searchResource(client:Client, query: SearchQuery)
{   
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

    let result = await client.search(body)
    
    logger("search").debug(JSON.stringify(body))
    let views =  makeViews(result.hits.hits) 
    if (!query.magic['safe']) {
        views = _.filter(views, (view) => {
            return !_.includes(view.tags, 'NSFW')
        })
    }
    return views
}

export async function deleteResource(client:Client, id: string) {
    logger("Store general").info("Deleting: " + id)
    let res = await client.update(id, {
        deleted: Date.now()            
    })
    logger("Store general").debug(res)
    return true
}

export async function updateTags(client:Client, resource:Resource) {
    return await client.update(resource.id, {
        tags: _.map(resource.tags, (o)=> {return o.toString()})
    })
}