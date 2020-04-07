#!/usr/bin/env bash

MOCHA_VERSION=$(node -p "require('./package.json').devDependencies.mocha.substring(1)")
MOCHA_URL="//unpkg.com/mocha@${MOCHA_VERSION}/mocha.js"

function testsuite {
  npm run testling --silent -- --html \
    | sed "s/src=\".*\/mocha.js\"/src=\"${MOCHA_URL//\//\\\/}\"/"
}

mkdir -p            "gh-pages/testling"
testsuite         > "gh-pages/testling/index.html"
touch               "gh-pages/.nojekyll"
echo node_modules > "gh-pages/.gitignore"
