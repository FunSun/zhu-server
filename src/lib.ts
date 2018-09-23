import { JSDOM } from 'jsdom'

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
