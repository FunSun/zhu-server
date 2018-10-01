declare module "bookmarks-parser" 
{
    function parse(content:string, cb: (err:Error, res:parse.ParseResult)=>void):void

    namespace parse {
        export type BookmarkNode = {
            type: string,
            title: string,
            url?: string,
            add_date: string,
            last_modified?: string,
            icon?: string
            ns_root?: string,
            children?: BookmarkNode[]
        }
        type ParseResult = {
            parser: string,
            bookmarks: BookmarkNode[],
        }
    
    }

    export = parse
}
