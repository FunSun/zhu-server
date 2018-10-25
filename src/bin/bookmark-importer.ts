// import parse = require('bookmarks-parser')
// import {BookmarkNode} from 'bookmarks-parser'
// import fs = require('fs')
// import * as _ from 'lodash'
// import {Tag, Link} from '../models'
// import { ResourceStore } from '../stores'

// let content = fs.readFileSync("/home/quanbit/文档/bookmarks_2018_10_1.html").toString("utf8")
// let rs = new ResourceStore("localhost:9200", "archive", "info")
// let linksBuffer:Link[] = []

// // function printBookmarkTree(root:BookmarkNode, indent:number) {
// //     let prefix = _.repeat("  ", indent)
// //     if (root.type === "folder" || root.children) {
// //         console.log(prefix, root.title)
// //         if (root.children && root.children.length > 0) {
// //             _.each(root.children, (node) => {
// //                 printBookmarkTree(node, indent+1)
// //             })
// //         }
// //     } else {
// //         console.log(prefix, root.title + " ( " + root.url + " ) ")
// //     }
// // }

// function importBookmarks(root:BookmarkNode, tags: Tag[]) {
//     if (root.type === "folder" || root.children) {
//         if (root.children && root.children.length > 0) {
//             let newTags = tags.slice()
//             if (root.title !== "Menu") {
//                 newTags.push(new Tag(root.title))
//             }
//             _.each(root.children, (node) => {
//                 importBookmarks(node, newTags)
//             })
//         }
//     } else {
//         let link = new Link(root.title, root.url, root.icon, tags)
//         linksBuffer.push(link)
//     }
// }

// parse(content, (err, res) => {
//     if (err) {
//         console.log(err)
//         return
//     }
//     importBookmarks(res.bookmarks[1], [])
//     rs.addLinks(linksBuffer).then((res) => {
//         console.log(res)
//     }).catch((err) => {
//         console.log(err)
//     })
// })

