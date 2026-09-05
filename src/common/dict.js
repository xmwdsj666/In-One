/*
 * 词库访问层：words.js 全量词表常驻（约 183KB），26 个首字母分片静态 import（blueos-pack 要求 ESM）。
 * 分片记录字段：w 全小写 key / a 原词形（大写缩写等才存在）/ p 音标 / t 释义数组 /
 *   ph 短语数组["en|cn"] / s 例句"en|cn" / l 考级标签
 * 词表按全小写 key 字母序排列，与分片顺序一致，二分安全。
 */
import words from './lexicon/words.js'
import lexiconA from './lexicon/a.js'
import lexiconB from './lexicon/b.js'
import lexiconC from './lexicon/c.js'
import lexiconD from './lexicon/d.js'
import lexiconE from './lexicon/e.js'
import lexiconF from './lexicon/f.js'
import lexiconG from './lexicon/g.js'
import lexiconH from './lexicon/h.js'
import lexiconI from './lexicon/i.js'
import lexiconJ from './lexicon/j.js'
import lexiconK from './lexicon/k.js'
import lexiconL from './lexicon/l.js'
import lexiconM from './lexicon/m.js'
import lexiconN from './lexicon/n.js'
import lexiconO from './lexicon/o.js'
import lexiconP from './lexicon/p.js'
import lexiconQ from './lexicon/q.js'
import lexiconR from './lexicon/r.js'
import lexiconS from './lexicon/s.js'
import lexiconT from './lexicon/t.js'
import lexiconU from './lexicon/u.js'
import lexiconV from './lexicon/v.js'
import lexiconW from './lexicon/w.js'
import lexiconX from './lexicon/x.js'
import lexiconY from './lexicon/y.js'
import lexiconZ from './lexicon/z.js'

const TAG_NAME = { G: '高考', 4: '四级', 6: '六级', K: '考研', I: '雅思', T: '托福' }

const byLetter = {
  a: lexiconA, b: lexiconB, c: lexiconC, d: lexiconD, e: lexiconE, f: lexiconF,
  g: lexiconG, h: lexiconH, i: lexiconI, j: lexiconJ, k: lexiconK, l: lexiconL,
  m: lexiconM, n: lexiconN, o: lexiconO, p: lexiconP, q: lexiconQ, r: lexiconR,
  s: lexiconS, t: lexiconT, u: lexiconU, v: lexiconV, w: lexiconW, x: lexiconX,
  y: lexiconY, z: lexiconZ,
}

const shardOf = letter => byLetter[letter] || []

// 词表二分：返回下标；词表结构 [key, tag, key, tag, ...]
function bisect(key) {
  let lo = 0
  let hi = words.length / 2
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (words[mid * 2] < key) lo = mid + 1
    else hi = mid
  }
  return lo
}

function find(word) {
  const key = String(word || '').toLowerCase()
  if (!/^[a-z]/.test(key)) return null
  const i = bisect(key)
  if (words[i * 2] !== key) return null
  const shard = shardOf(key[0])
  let lo = 0
  let hi = shard.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (shard[mid].w < key) lo = mid + 1
    else hi = mid
  }
  return shard[lo] || null
}

// 前缀联想（命中段连续收集），不足时以包含匹配兜底；返回 [{w, l}]
function suggest(prefix, max) {
  const limit = max || 8
  const p = String(prefix || '').toLowerCase()
  if (!/^[a-z]/.test(p)) return []
  const out = []
  const seen = {}
  for (let i = bisect(p); i < words.length / 2 && out.length < limit; i++) {
    const w = words[i * 2]
    if (w.indexOf(p) !== 0) break
    out.push({ w, l: words[i * 2 + 1] })
    seen[w] = 1
  }
  if (out.length < limit) {
    for (let i = 0; i < words.length / 2 && out.length < limit; i++) {
      const w = words[i * 2]
      if (!seen[w] && w.indexOf(p) > 0) out.push({ w, l: words[i * 2 + 1] })
    }
  }
  return out
}

function tagName(tag) {
  return TAG_NAME[tag] || tag
}

export default {
  words,
  find,
  suggest,
  tagName,
  shardOf,
}
