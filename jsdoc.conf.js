
module.exports = {
  plugins: [],
  recurseDepth: 10,
  sourceType: "module",
  source: {
    include: ["./src/whif.js"],
    includePattern: ".+\\.js(doc|x)?$",
    excludePattern: "(^|\\/|\\\\)_"
  },
  tags: {
    allowUnknownTags: true,
    dictionaries: ["jsdoc", "closure"]
  },
  templates: {
    cleverLinks: false,
    monospaceLinks: false
  },
  opts: {
    // "template: "templates/default",
    explain: true,
    encoding: "utf8",
    destination: "./docs/",
    readme: "./README.md"
  }
}
