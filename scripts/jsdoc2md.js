#!/usr/bin/env node

var fs = require('fs')


/**
 * main
 */
function renderSignature (ds) {
  var signature = [`##### \`${ds.longname}\` (${ds.scope})\n${ds.description}\n`]

  if (ds.params) {
    signature.push(...ds.params.map(param =>
      `- \`${param.name}: ${param.type.names[0]}\` - ${param.description}`
    ))
  }
  if (ds.returns) {
    signature.push(...ds.returns.map(ret =>
      `- \`<return>: ${ret.type.names[0]}\` - ${ret.description}`
    ))
  }

  signature.push('\n')
  return signature.join('\n')
}

function render (jsdoc) {
  var comments = JSON.parse(jsdoc)
  var docstrings = comments.filter(ds => ds.access === 'public')
  var cls = docstrings.find(ds => ds.kind === 'class' && ds.name === 'whif')
  var methods = docstrings.filter(ds => ds.scope === 'instance' && ds.memberof === cls.name)
  var statics = docstrings.filter(ds => ds.scope === 'static' && ds.memberof === cls.name)
  
  cls.longname = '[new] ' + cls.longname

  return `
## API reference
${renderSignature(cls)}
${methods.map(renderSignature).join('\n')}
${statics.map(renderSignature).join('\n')}
`
}


/**
 * io
 */
function raise (err) {
  if (err) throw err
}

function pipe (from, through, to) {
  fs.readFile(from, 'utf8', (err, data) => {
    raise(err)
    fs.write(to, through(data), raise)
  })
}


if (require.main === module) {
  pipe(0, render, 1) 
}