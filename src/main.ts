import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as _ from 'lodash'
import * as elasticsearch from 'elasticsearch'
const { getAllText } =  require('./lib')
import {JSDOM} from 'jsdom'

const app = express()
app.use(bodyParser.raw({
    inflate: true,
    limit: '100kb',
    type: '*/*'
  }))
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
        index: 'collection',
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

app.get('/resources/search', (req, res, next) => {
    let q = req.query.q

    let client = new elasticsearch.Client({
        host: 'localhost:9200',
        log: 'info'
    })
    client.search({
        index: 'collection',
        body: {
            "query": {
                "query_string": {
                    "default_field": "fulltext",
                    "query": q
                }
              },
            "highlight": {
                "fields": {
                    "fulltext": {}
                }
            }
        }
    }).then((result) => {
        res.status(200).send(_.map(result.hits.hits, (el) => {
            let {fulltext, ...view} = el._source as any
            view.id = el._id
            view.highlight = el.highlight.fulltext[0]
            return view
        }))
        next()
    })

})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))