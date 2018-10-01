import * as stores from './index'
import { Link } from '../models'
import * as _ from 'lodash'

test("test insert link", async () => {
    try {
        let rs = new stores.ResourceStore("localhost:9200", "test-collection", "debug")
        let res = await rs.addLinks([new Link("zhihu", "https://www.zhihu1.com")])
        let reduced = true
        res.forEach((v, k) => {
            reduced = reduced && v
        })
        expect(reduced).toBeTruthy()
    } catch (e) {
        console.log(e)
        fail()
    }
})