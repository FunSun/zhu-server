import * as crypto from 'crypto'

export enum Types {
    Link = 'link',
}

export class Tag {
    name: string
    parent: Tag
    children: Tag[]

    constructor(name: string) {
        this.name = name
    }

    toString(): string {
        return this.name
    }
}

export class Resource {
    id: string
    tags: Tag[]
    created: Date
}

export class FamousResource extends Resource {
    from: string
}

export class ArchivedResource implements FamousResource {
    id: string
    tags: Tag[]
    created: Date
    from: string    
    title: string
    content: string
}

export class Link implements FamousResource {
    id: string
    tags: Tag[]
    created: Date
    from: string    
    title: string
    favicon: string

    constructor(title: string, url:string, favicon?: string, tags?: Tag[]) {
        this.title = title
        this.from = url
        this.favicon = favicon?favicon:""
        this.tags = tags?tags:[]
        this.id = hashCode(this.from)
        this.created = new Date()
    }
}

export class ZhihuAnswer extends ArchivedResource {}

export class Comment extends Resource {
    constructor(content:string, tags?:Tag[]) {
        super()
        this.content = content
        this.tags = tags || []
    }
    content: string
}

export class Article extends Resource {
    constructor(title:string, content:string, tags?:Tag[]) {
        super()
        this.title = title
        this.content = content
        this.tags = tags || []
    }
    title: string
    content: string
}

function hashCode(s: string): string {
    return crypto.createHash('md5').update(s).digest('base64')
}