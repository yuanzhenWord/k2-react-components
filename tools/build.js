'use strict'

const fs = require('fs')
// const fsCopy = require('fs-extra')
const path = require('path')
const del = require('del')
const rollup = require('rollup')
const babel = require('rollup-plugin-babel')
const pkg = require('../package.json')
const v = require('voca')
// const postcss = require('rollup-plugin-postcss')
const postcss = require('postcss')

const componentsPath = './src/components'
const componentDirs = fs.readdirSync(componentsPath).filter((file) => {
  return fs.statSync(path.join(componentsPath, file)).isDirectory()
})

let promise = Promise.resolve()

// Clean up the output directory
promise = promise.then(() => del(['lib/*']))

const babelConfig = {
  babelrc: false,
  exclude: 'node_modules/**',
  runtimeHelpers: true,
  plugins: [
    // ['import', [{ 'libraryName': 'antd', 'style': 'css' }]],
    'external-helpers',
  ],
  presets: [['latest', { es2015: { modules: false } }], 'react', 'stage-0'],
}

function rollupBuild (format, moduleName, entry, dest) {
  return promise.then(() => rollup.rollup({
    entry,
    external: Object.keys(pkg.dependencies),
    plugins: [babel(babelConfig)],
  }).then(bundle => bundle.write({
    dest,
    format,
    sourceMap: true,
    moduleName: format === 'umd' ? moduleName : undefined,
  })))
}

let promises = []
// for (const format of ['es', 'cjs', 'umd']) {
// for (const format of ['es', 'cjs']) {
//   rollupBuild(format, 'k2_react_components',
//     'src/index.js', `lib/${format === 'cjs' ? 'index' : `index.${format}`}.js`)
//   componentDirs.map((dir) => {
/**
 * formart: es, cjs, umd. es: ignore, cjs: publish, umd: examples.
 */
const formats = ['es', 'cjs', 'umd']
formats.forEach((format) => {
  if (format === 'es') { return }
  componentDirs.forEach((dir) => {
    promises.push(rollupBuild(format, dir, `${componentsPath}/${dir}/index.js`,
      format === 'cjs'
        ? `lib/${dir}/${format === 'cjs' ? 'index' : `index.${format}`}.js`
        : `examples/${v.kebabCase(dir)}/bundle.js`))
  })
})

/**
 * css
 */
function buildCss () {
  componentDirs.forEach((dir) => {
    postcss([ require('autoprefixer'), require('cssnano') ])
      .process(fs.readFileSync(`${componentsPath}/${dir}/${dir}.css`, 'utf-8'), {
        from: `${componentsPath}/${dir}/${dir}.css`,
        to: `lib/${dir}/index.css` })
      .then(function (result) {
        fs.writeFileSync(`./lib/${dir}/index.css`, result.css)
        fs.writeFileSync(`./examples/${v.kebabCase(dir)}/bundle.css`, result.css)
        if (result.map) fs.writeFileSync(`lib/${dir}/index.css.map`, result.map)
      })
      .catch((e) => {
        console.error(e)
      })
  })
}

// Copy package.json and LICENSE.txt
promise = Promise.all(promises).then(() => {
  delete pkg.private
  delete pkg.devDependencies
  delete pkg.scripts
  delete pkg.eslintConfig
  delete pkg.babel
  fs.writeFileSync('lib/LICENSE.txt', fs.readFileSync('LICENSE.txt', 'utf-8'), 'utf-8')
  buildCss()
  // fsCopy.copySync(path.resolve('src/static'), path.resolve('lib'))
})

promise.catch(err => console.error(err.stack)) // eslint-disable-line no-console
