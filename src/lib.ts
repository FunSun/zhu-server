import { JSDOM } from 'jsdom'
import { Tag } from './models'
import * as _ from 'lodash'

export function getAllText(dom:JSDOM) {
    let window = dom.window
    let document = window.document
    let walker = document.createTreeWalker(
        document.body, 
        window.NodeFilter.SHOW_TEXT, 
        null, 
        false
    )

    let node
    let textNodes = []

    while(node = walker.nextNode()) {
        textNodes.push(node.nodeValue)
    }
    return textNodes
}

export function stringArrayToTags(strArr:string[]): Tag[] {
    return _.map(strArr, (o) => {
        return new Tag(o)
    })
}