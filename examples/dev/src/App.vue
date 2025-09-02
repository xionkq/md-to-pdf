<template>
  <main class="container">
    <h1>md-to-pdf 示例</h1>
    <section class="controls">
      <textarea v-model="markdown" rows="20" />
      <button @click="onDownload">下载 PDF</button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { downloadPdf } from '../../../src'

const markdown = ref(`# 标题\n\n这是一段中文内容，用于展示中文字体注入后的显示与复制效果。`)

async function imageResolver(src: string): Promise<string> {
  // 优先使用用户提供的 imageResolver，否则会默认将 url 转 base64（几乎必跨域）
  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(`/proxy${url}`) // 注意加上 /proxy 前缀
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // 如果是 dataURL，直接返回
  if (src.startsWith('data:')) {
    return src
  }

  // 如果是完整的 HTTP/HTTPS URL，尝试直接使用
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return await urlToBase64(src)
  }

  // 对于相对路径或其他格式，也直接返回让 pdfmake 尝试处理
  return src
}

async function onDownload() {
  await downloadPdf(markdown.value, 'example-cn.pdf', {
    enableHtml: true,
    // imageResolver,
  })
}
</script>

<style scoped>
.container {
  max-width: 820px;
  margin: 24px auto;
  padding: 0 16px;
}
.controls {
  display: grid;
  gap: 12px;
}
textarea {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
button {
  width: fit-content;
}
</style>
