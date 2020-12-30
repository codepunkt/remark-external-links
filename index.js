var visit = require('unist-util-visit')
var definitions = require('mdast-util-definitions')
var spaceSeparated = require('space-separated-tokens').parse
var absolute = require('is-absolute-url')
var extend = require('extend')

module.exports = externalLinks

var defaultTarget = '_blank'
var defaultRel = ['nofollow', 'noopener', 'noreferrer']
var defaultProtocols = ['http', 'https']

function externalLinks(options) {
  var settings = options || {}
  var target = settings.target
  var rel = settings.rel
  var protocols = settings.protocols || defaultProtocols
  var contentProperties = settings.contentProperties || {}
  var transformChildren = settings.transformChildren
  var beforeContent = settings.beforeContent

  if (typeof rel === 'string') {
    rel = spaceSeparated(rel)
  }

  return transform

  function transform(tree) {
    var definition = definitions(tree)

    visit(tree, ['link', 'linkReference'], visitor)

    function visitor(node) {
      var ctx = node.type === 'link' ? node : definition(node.identifier)
      var protocol
      var data
      var props

      /* istanbul ignore if - undefined references can be injected into the tree
       * by plugins. */
      if (!ctx) return

      protocol = ctx.url.slice(0, ctx.url.indexOf(':'))

      if (absolute(ctx.url) && protocols.indexOf(protocol) !== -1) {
        data = node.data || (node.data = {})
        props = data.hProperties || (data.hProperties = {})
        
        let content = typeof settings.content === 'function' ? settings.content(ctx.url) : settings.content

        if (typeof content === 'object' && !('length' in content)) {
          content = [content]
        }

        if (target !== false) {
          props.target = target || defaultTarget
        }

        if (rel !== false) {
          props.rel = (rel || defaultRel).concat()
        }
        
        if (typeof transformChildren === 'function') {
          node.children = transformChildren(node.children)
        }

        if (content) {
          // `fragment` is not a known mdast node, but unknown nodes with
          // children are handled as elements by `mdast-util-to-hast`:
          // See: <https://github.com/syntax-tree/mdast-util-to-hast#notes>.
          if (beforeContent) {
            node.children.push(beforeContent)
          }
          
          node.children.push({
            type: 'fragment',
            children: [],
            data: {
              hName: 'span',
              hProperties: extend(true, contentProperties),
              hChildren: extend(true, content)
            }
          })
        }
      }
    }
  }
}
