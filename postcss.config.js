/* 探测：packer 编译进程内可用的环境变量 */
module.exports = () => ({
  postcssPlugin: 'probe-env',
  Once(root, { result }) {
    try {
      const keys = Object.keys(process.env).filter(k => /blue|device|watch|hap|quick/i.test(k))
      // eslint-disable-next-line no-console
      console.log('[postcss-probe] device-relevant env:', JSON.stringify(keys), '| NODE_ENV:', process.env.NODE_ENV, '| DT:', process.env.DEVICE_TYPE)
    } catch (e) { /* ignore */ }
  },
})
module.exports.postcss = true
