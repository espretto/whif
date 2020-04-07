#!/usr/bin/env bash

GHP="gh-pages/testling"
MOCHA_VERSION=$(node -p "require('./package.json').devDependencies.mocha.substring(1)")
MOCHA_URL="//unpkg.com/mocha@${MOCHA_VERSION}/mocha.js"

mkdir -p "$GHP"
npm run testling --silent -- --html \
  | sed "s/<script src=\".*\/mocha.js\"/<script src=\"${MOCHA_URL//\//\\\/}\"/" \
  > "${GHP}/index.html"
