import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as _ from 'lodash'
import * as elasticsearch from 'elasticsearch'
import { getAllText, stringArrayToTags } from './lib'
import {JSDOM} from 'jsdom'
import { ResourceStore } from './stores'
import { Resource, Link, Tag } from './models'

const app = express()
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
    console.log(`check if ${url} exist`)
    let rs = new ResourceStore("localhost:9200", "archive", "info")
    rs.linkExist(new Link("", url)).then((exist) => {
        if (exist) {
            res.status(201).send("")
        } else {
            res.status(201).send("")
        }
        next()
    })
})

app.post('/resources/link', (req, res, next) => {
    let body = JSON.parse(req.body.toString()) as any
    let rs = new ResourceStore("localhost:9200", "archive", "info")
    rs.addLinks([new Link(body.title, body.url, body.favicon)]).then(() => {
        res.status(200).send("")
        next()
    }).catch(() => {
        res.status(500).send("")
        next()
    })
})

app.get('/resources/search', (req, res, next) => {
    let q = req.query.q as string
    let tokens = _.filter(_.split(q, " "), (o)=> {return !!o}) as string[]
    let normalTokens:string[] = []
    let tags: Tag[] = []
    let facet:{[key:string]:string} = {}
    _.each(tokens, (token)=> {
        if (!_.includes(token, ":")) {
            normalTokens.push(token)
        } else if (_.startsWith(token, "tags:")) {
            tags.push(..._.map(_.split(_.trimStart(token, "tags:"), ","), (o) => {return new Tag(o)}))
        } else {
            let [k, v] = _.split(token, ":")
            facet[k] = v
        }
    })
    let rs = new ResourceStore("localhost:9200", "archive", "debug")
    rs.search(normalTokens.join(" "), tags, facet).then((views) => {
        res.status(200).send(views)
    })
})

app.post('/resources/tags', (req, res, next) => {
    let query = JSON.parse(req.body.toString())
    let rs = new ResourceStore("localhost:9200", "archive", "debug")
    let r = new Resource()
    r.id = query.id
    r.tags = stringArrayToTags(query.tags)
    rs.updateTags(r).then(() => {
        res.status(200).send()
        next()
    })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))