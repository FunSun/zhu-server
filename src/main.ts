// logger as a builtin
import {replaceConsoleLog} from './logger'
replaceConsoleLog()

import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as _ from 'lodash'
import * as elasticsearch from 'elasticsearch'
import { getAllText, stringArrayToTags } from './lib'
import {JSDOM} from 'jsdom'
import { ResourceStore } from './stores'
import { Resource, Link, Tag, Comment, Article } from './models'


let rs = new ResourceStore("localhost:9200", "archive", "error")

const app = express()
app.use((req, res, next) => {
    next()
    logger("Web").info(req.path, res.statusCode)
})
app.disable('etag')
app.use(bodyParser.raw({
    inflate: true,
    limit: '100kb',
    type: '*/*'
}))
app.use(cors())
const port = 8070

// TODO: 把内容里的所有文本节点抽取出来放到fulltext字段里
// TODO: 处理 keyword
function processWebArticle(type:any, req:any, res:any, next:any) {
    let requestBody = req.body.toString().split('\n')
    let from = requestBody[0]
    let title = requestBody[1]
    let tags =  requestBody[2].split(',')
    let content = requestBody.slice(3).join('\n')
    let dom = new JSDOM(content)
    let allText = _.filter(getAllText(dom), (el)=> {
        if (_.startsWith(el, '<img ')) {
            return false
        }
        return true
    })
    let fulltext = title + ' ' + allText.join(' ')
    let client = new elasticsearch.Client({
        host: 'localhost:9200',
        log: 'info'
    })

    client.index({
        index: 'archive',
        type: '_doc',
        body: {
            from: from,
            content: content,
            title: title,
            fulltext: fulltext,
            tags: tags,
            type: type,
            created: Date.now()
        }
    }).then(() => {
        res.status(200).send("发送成功")
        next()
    })
}
  
app.post('/resources/zhihu', (req, res, next) => {
    processWebArticle('zhihu', req, res, next)
})

app.post('/resources/blog', (req, res, next) => {
    processWebArticle('blog', req, res, next)
})

app.get('/resources/link/exist', (req, res, next) => {
    let url = req.query.url as string
    logger("Web").info(`check if ${url} exist`)
    rs.linkExist(new Link("", url)).then((exist) => {
        if (exist) {
            res.status(201).send("")
        } else {
            res.status(200).send("")
        }
        next()
    })
})

app.post('/resources/link', (req, res, next) => {
    let body = JSON.parse(req.body.toString()) as any
    rs.addLinks([new Link(body.title, body.url, body.favicon)]).then((result) => {
        if (result.get(body.url)) {
            logger("Web").info(`Successful stored ${body.title} <${body.url}>`)
            res.status(200).send("")
        } else {
            res.status(500).send("")
        }
        next()
    }).catch(() => {
        res.status(500).send("")
        next()
    })
})

app.get('/resources/search', (req, res, next) => {
    let q = req.query.q as string
    if (q === 'undefined') {
        logger("Web search").error("client pass a 'undefined' as a query")
        res.status(400).send()
        next()
        return
    }
    if (q ==='random') {
        let limit = req.query.limit?parseInt(req.query.limit as string):24
        rs.randomSearch(limit).then((views) => {
            res.status(200).send(views)
            next()
        })
        return
    }
    let offset = req.query.offset?parseInt(req.query.offset as string):0
    let limit = req.query.limit?parseInt(req.query.limit as string):24
    let tokens = _.filter(_.split(q, " "), (o)=> {return !!o}) as string[]
    let normalTokens:string[] = []
    let tags: Tag[] = []
    let facet:{[key:string]:string} = {}
    _.each(tokens, (token)=> {
        if (!_.includes(token, ":")) {
            normalTokens.push(token)
        } else if (_.startsWith(token, "tags:")) {
            tags.push(..._.map(_.split(token.replace(/tags:/, ''), ","), (o) => {return new Tag(o)}))
        } else {
            let [k, v] = _.split(token, ":")
            facet[k] = v
        }
    })

    rs.search(normalTokens.join(" "), tags, facet, offset, limit).then((views) => {
        res.status(200).send(views)
        next()
    })
})

app.post('/resources/tags', (req, res, next) => {
    let query = JSON.parse(req.body.toString())
    let r = new Resource()
    r.id = query.id
    r.tags = stringArrayToTags(query.tags)
    rs.updateTags(r).then(() => {
        res.status(200).send()
        next()
    })
})

app.post('/resources/comment', (req, res, next) => {
    let query = JSON.parse(req.body.toString())    
    rs.addComment(new Comment(query.content)).then(() => {
        res.status(200).send()
        next()
    }).catch((e) => {
        logger("Web addComment").error(e)
        res.status(500).send()
        next()
    })
})

app.post('/resources/article', (req, res, next) => {
    let query = JSON.parse(req.body.toString())
    logger("Web updateArticle").debug(query)
    if (query.id) {
        let article = new Article(query.title, query.content)
        article.id = query.id
        rs.updateArticle(article).then(() => {
            res.status(200).send()
            next()
        }).catch((e) => {
            logger("Web updateArticle").error(e)
            res.status(500).send()
            next()
        })
        
    } else {
        rs.addArticle(new Article(query.title, query.content)).then(() => {
            res.status(200).send()
            next()
        }).catch((e) => {
            logger("Web addArticle").error(e)
            res.status(500).send()
            next()
        })
    
    }
})

app.listen(port, () => logger("main").info(`Example app listening on port ${port}!`))