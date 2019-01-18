// logger as a builtin
import {replaceConsoleLog} from './logger'

replaceConsoleLog()

import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as _ from 'lodash'
import { stringArrayToTags } from './lib'
import { ResourceStore } from './stores'
import { Resource, Link, Tag, Comment, Article, Blog, Snippet } from './models'
import * as path from 'path'


let rs = new ResourceStore("localhost:9200", "archive", "error")

const app = express()

app.use('/ui', express.static(path.join(__dirname, 'ui')))

app.use((req, res, next) => {
    next()
    logger("Web").info(req.path, res.statusCode)
})
app.disable('etag')
app.use(bodyParser.raw({
    inflate: true,
    limit: '1MB',
    type: '*/*'
}))
app.use(cors())
  
app.post('/resources/blog', (req, res, next) => {
    let body = JSON.parse(req.body.toString()) as any
    let tags = stringArrayToTags((body.tags) || [])
    rs.addBlog(new Blog(body.title, body.url, body.content, body.fulltext, tags)).then((result) => {
        logger("Web blog").info(`Successful stored blog ${body.title} <${body.url}>`)
        res.status(200).send("")
        next()
    }).catch(() => {
        res.status(500).send("")
        next()
    })
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
    let tags = stringArrayToTags((body.tags) || [])
    
    rs.addLink(new Link(body.title, body.url, body.favicon, tags)).then((result) => {
        logger("Web").info(`Successful stored ${body.title} <${body.url}>`)
        res.status(200).send("")
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

    let offset = req.query.offset?parseInt(req.query.offset as string):0
    let limit = req.query.limit?parseInt(req.query.limit as string):24
    let tokens = _.filter(_.split(q, " "), (o)=> {return !!o}) as string[]
    let normalTokens:string[] = []
    let tags: Tag[] = []
    let facet:{[key:string]:string} = {}
    let safe = false
    let random = false
    _.each(tokens, (token)=> {
        if (_.startsWith(token, "tags:")) {
            tags.push(..._.map(_.split(token.replace(/tags:/, ''), ","), (o) => {return new Tag(o)}))
        } else if (_.includes(token, ":")) {
            let [k, v] = _.split(token, ":")
            facet[k] = v
        } else if (_.startsWith(token, "_")) {
            if (token === '_safe') {
                safe = true
            } else if (token === '_random') {
                random = true
            } else {
                logger("Web search").error("Unrecognized search option: ", token)
            }
        } else {
            normalTokens.push(token)
        }
    })

    rs.search({
        fulltext: normalTokens.join(" "),
        tags: tags,
        facet: facet, 
        offset,
        limit,
        magic: {safe, random}
    }).then((views) => {
        res.status(200).send(views)
        next()
    }).catch((err:Error) => {
        res.status(500).send(err.message)
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

app.post('/resources/snippet', (req, res, next) => {
    let query = JSON.parse(req.body.toString())    
    rs.addSnippet(new Snippet(query.content, query.tags)).then(() => {
        res.status(200).send()
        next()
    }).catch((e) => {
        logger("Web addSnippet").error(e)
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
        rs.updateArticle(article).then((data) => {
            res.status(200).send(data)
            next()
        }).catch((e) => {
            logger("Web updateArticle").error(e)
            res.status(500).send()
            next()
        })
        
    } else {
        rs.addArticle(new Article(query.title, query.content)).then((data) => {
            res.status(200).send(data)
            next()
        }).catch((e) => {
            logger("Web addArticle").error(e)
            res.status(500).send()
            next()
        })
    
    }
})

app.delete('/resources', (req, res, next) => {
    let query = req.query
    logger("Web deleteResource").debug(query)
    if (!query.id) {
        res.status(400).send()
        next()
        return
    }
    rs.deleteResource(query.id)
    res.status(200).send()
    next()
})

app.put('/backups', (req, res, next) => {
    rs.backup().then((backup) => {
        res.status(200).send(backup)
        next()
    }).catch((err:Error)=>{
        res.status(500).send(err.message)
        next()
    })
})


app.get('/backups', (req, res, next) => {
    rs.getBackups().then((backups) => {
        res.status(200).send(backups)
        next()
    }).catch((err:Error)=>{
        res.status(500).send(err.message)
        next()
    })
})

app.delete('/backups', (req, res, next) => {
    let id = req.query.id
    rs.deleteBackup(id).then(() => {
        res.status(200).send()
        next()
    }).catch((err:Error)=>{
        res.status(500).send(err.message)
        next()
    })
})

app.post('/restore', (req, res, next) => {
    let id = req.query.id
    rs.restore(id).then((ret) => {
        res.status(200).send(ret)
        next()
    }).catch((err:Error)=>{
        res.status(500).send(err.message)
        next()
    })
})


rs.init()

let port = parseInt(process.argv[process.argv.length-1])
app.listen(port, () => logger("main").info(`Example app listening on port ${port}!`))
