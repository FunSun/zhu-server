import * as elasticsearch from 'elasticsearch'
import {hashCode} from '../models'
import {initES} from './init'

function sleep(ms: number) {
    return new Promise((resolve)=> {
        setTimeout(resolve, ms)
    })
}

export default class Client {
    host: string
    logLvl: string
    index: string
    green: boolean
    status: string
    constructor(host:string, index:string, logLvl: string, ) {
        this.host = host
        this.logLvl = logLvl
        this.index = index
        this.green = false
        this.status = "Not Init"
    }

    async init() {
        let conn = new elasticsearch.Client({
            host: this.host,
            log: this.logLvl
        })
        this.status = "Initializing..."
        while (true) {
            try {
                let res = await conn.cat.health({format:"json"})
                if (res[0].status === 'green') {
                    break
                }
                this.status = "ES in status: " + res[0].status
                
            } catch(e) {
                this.status = "Cannot connect to ES"
                
            }
            logger("Store Client").info("Waiting cluster turn green.")
            await sleep(2000)
        }
        try {
            await conn.indices.getAlias({name: "archive"})
        } catch(e) {
            initES(conn)
        }
        this.green = true
    }

    getConnection(): elasticsearch.Client {
        if (!this.green) {
            logger("Store Client").error("ES not ready: " + this.status) 
            throw new Error("ES not ready")
        }
        return new elasticsearch.Client({
            host: this.host,
            log: this.logLvl
        })
    }

    async search(body:any) {
        let conn = this.getConnection()
        return await conn.search({
            index: this.index,
            body: body
        })        
    }

    async upsert(id: string, body: any) {
        let conn = this.getConnection()
        return await conn.index({
            index: this.index,
            type: "_doc",
            id: id,
            body: body
        })

    }

    async update(id:string, body: any) {
        let conn = this.getConnection()
        return await conn.update({
            index: this.index,
            type: '_doc',
            id: id,
            body: {
                doc: body
            }
        })

    }

    async create(body: any) {
        let conn = this.getConnection()
        return await conn.create({
            index: this.index,
            type: "_doc",
            id: hashCode(Date.now().toString()),
            body: body
        })
    }

    async get(id:string) {
        let conn = this.getConnection()
        return await conn.get({
            index: this.index,
            type: '_doc',
            id: id
        })
    }

    async backup() {
        let conn = this.getConnection()
        let res = await conn.snapshot.create({
            snapshot: "backup_" + Date.now().toString(),
            repository: "archive_backups",
            waitForCompletion: true,
            body: {
                "indices": "archive",
                "ignore_unavailable": true,
                "include_global_state": false 
            }
        })
        logger("Store Client").info(res)
        return res.snapshot
    }

    async getBackups() {
        let conn = this.getConnection()
        return await conn.snapshot.get({
            repository: "archive_backups",
            snapshot: '*',
            ignoreUnavailable: true
        })
    }

    async deleteBackup(id: string) {
        let conn = this.getConnection()        
        return await conn.snapshot.delete({
            snapshot: id,
            repository: "archive_backups"
        })
    }

    async restore(id:string) {
        let conn = this.getConnection()
        logger("Store client").info("Restore to: ", id)
        try {
            let data = await conn.indices.getAlias({
                name: 'archive'
            })
            await conn.indices.delete({
                index: Object.keys(data)[0]
            })
            return await conn.snapshot.restore({
                snapshot: id,
                repository: "archive_backups"
            })
        } catch(e) {
            logger("Store client").error(e.message)
            throw new Error("Restore failed")
        }
    }
}