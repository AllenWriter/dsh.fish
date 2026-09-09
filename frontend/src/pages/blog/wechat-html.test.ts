import { describe, expect, it } from 'vitest'
import {
  extractWechatJsContent,
  prepareWechatHtmlBody,
  rewriteWechatImageSrcs,
  sanitizeWechatHtml,
  wechatHtmlAssetPath,
  wechatImagesPublicPrefix,
} from './wechat-html'

describe('wechat-html', () => {
  it('builds asset paths', () => {
    expect(wechatHtmlAssetPath('dong-jian-hua-de-shi-zi-shan-xia-a56bee')).toBe(
      '/blog/wechat/dong-jian-hua-de-shi-zi-shan-xia-a56bee/article.wechat.html',
    )
    expect(wechatImagesPublicPrefix('abc')).toBe('/blog/wechat/abc/images/')
  })

  it('extracts #js_content from a full archive document', () => {
    const raw = `<!DOCTYPE html><html><body><div class="wrap"><div id="js_content" class="rich_media_content"><p style="color:red">你好</p><div>内层</div></div></div></body></html>`
    expect(extractWechatJsContent(raw)).toBe(
      '<p style="color:red">你好</p><div>内层</div>',
    )
  })

  it('rewrites relative images/ paths', () => {
    const html =
      '<img data-src="images/01.png" src="images/01.png"><img src="./images/02.jpg">'
    expect(rewriteWechatImageSrcs(html, 'slug-x')).toBe(
      '<img data-src="/blog/wechat/slug-x/images/01.png" src="/blog/wechat/slug-x/images/01.png"><img src="/blog/wechat/slug-x/images/02.jpg">',
    )
  })

  it('strips script, iframe, and on* handlers but keeps style', () => {
    const dirty =
      '<section style="color:#333" onclick="alert(1)"><p onmouseover="x()">ok</p><script>evil()</script><iframe src="https://x"></iframe><img src="javascript:alert(1)" style="width:100%"><img src="/blog/wechat/s/images/01.png" style="width:100%"></section>'
    const clean = sanitizeWechatHtml(dirty)
    expect(clean).toContain('style="color:#333"')
    expect(clean).toContain('style="width:100%"')
    expect(clean).toContain('/blog/wechat/s/images/01.png')
    expect(clean).not.toContain('onclick')
    expect(clean).not.toContain('onmouseover')
    expect(clean).not.toContain('<script')
    expect(clean).not.toContain('<iframe')
    expect(clean).not.toContain('javascript:')
  })

  it('prepareWechatHtmlBody runs extract + rewrite + sanitize', () => {
    const raw = `<html><body><div id="js_content"><p onclick="x()" style="margin:0">文<img src="images/01.png"></p><script>bad</script></div></body></html>`
    const out = prepareWechatHtmlBody(raw, 'dong')
    expect(out).toContain('style="margin:0"')
    expect(out).toContain('/blog/wechat/dong/images/01.png')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('script')
  })
})
