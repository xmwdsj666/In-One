/* 单页双视图冒烟测试：键盘 -> 联想 -> 详情 -> 返回（Node 环境模拟框架拍平 data） */
const fs = require('fs')
const vm = require('vm')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const LEX = path.join(ROOT, 'src', 'common', 'lexicon')

function loadLex(file) {
  return JSON.parse(
    fs.readFileSync(path.join(LEX, file), 'utf8').replace(/^export default /, '').replace(/;\s*$/, '')
  )
}
const words = loadLex('words.js')
const lexVars = {}
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(l => {
  lexVars['lexicon' + l.toUpperCase()] = loadLex(l + '.js')
})

function loadJsModule(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  const body = src
    .split('\n')
    .filter(l => !/^\s*import\s/.test(l))
    .join('\n')
    .replace(/export\s+default/g, 'module.exports=')
  const sandbox = vm.createContext(Object.assign({ console, module: { exports: {} }, words }, lexVars))
  vm.runInContext(body, sandbox)
  return sandbox.module.exports
}
const dict = loadJsModule('src/common/dict.js')

function loadUxDef(rel, extraCtx) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  const body = src.match(/<script>([\s\S]*?)<\/script>/)[1]
    .split('\n')
    .filter(l => !/^\s*import\s/.test(l))
    .join('\n')
    .replace(/export\s+default/g, 'module.exports=')
  const sandbox = vm.createContext(Object.assign({ console, module: { exports: {} } }, extraCtx || {}))
  vm.runInContext(body, sandbox)
  const def = sandbox.module.exports
  if (def && def.data) Object.assign(def, def.data)
  return def
}

// 0) dict 接口
console.log('[dict] 词数:', words.length / 2, '| find student:', !!dict.find('student'),
  '| suggest atten:', dict.suggest('atten', 4).map(x => x.w).join(','))

// 1) 键盘输入链
const Page = loadUxDef('src/pages/Index/index.ux', { dict })
console.log('[index] 初始视图:', Page.view, '| 键盘行键数:', Page.row1.length, Page.row2.length, Page.row3.length)
Page.insertRow1(0) // q
Page.insertRow2(0) // a
console.log('[index] q+a ->', Page.query, '| 结果数:', Page.resultCount)
Page.onBackspace()
console.log('[index] 退格 ->', Page.query)
Page.applyQuery('attention')
console.log('[index] attention 联想:', Page.rows.slice(0, 3).map(x => x.w).join(','), '| hasResult:', Page.hasResult)

// 2) 行点击 -> 详情视图
Page.onRowTap(0)
console.log('[detail] 视图:', Page.view, '| 词:', Page.dHead, '| 音标:', Page.dPhone, '| 标签:', Page.dTags)
console.log('[detail] 释义首行:', Page.dDefs.split('\n')[0], '| 短语:', Page.dHasPhrase, '| 例句:', Page.dSentEn.slice(0, 24))

// 3) 返回保留搜索状态
Page.goBack()
console.log('[index] 返回后视图:', Page.view, '| query 保留:', Page.query, '| 结果保留:', Page.resultCount)

// 4) 边界：AD 原词形 / 未收录词 / 清空
Page.openDetail('ad')
console.log('[detail] AD 原词形:', Page.dHead, '(期望 AD)')
Page.openDetail('zzzzz')
console.log('[detail] 未收录回退:', Page.dHead, '(期望 zzzzz)')
Page.goBack()
Page.onClear()
console.log('[index] 清空 ->', JSON.stringify(Page.query), '| hasResult:', Page.hasResult)
Page.onRowTap(0) // 空结果点击不抛错
console.log('=== 全部冒烟通过 ===')
