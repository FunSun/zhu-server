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

export interface Resource {
    id: string
    tags: Tag[]
    created: Date
}

export interface FamousResource extends Resource {
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

function hashCode(s: string): string {
    return crypto.createHash('md5').update(s).digest('base64')
}