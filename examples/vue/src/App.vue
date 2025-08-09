<template>
  <main class="container">
    <h1>md-to-pdf 中文字体注入示例</h1>
    <section class="controls">
      <textarea v-model="markdown" rows="10"/>
      <div class="font-uploader">
        <label>上传中文字体 (TTF/Subsets):</label>
        <input type="file" accept=".ttf,.otf" @change="onFontUpload" />
      </div>
      <div class="font-remote">
        <label>或从 URL 加载字体：</label>
        <input v-model="fontUrl" placeholder="https://cdn.example.com/NotoSansSC-Regular.subset.ttf" />
        <button @click="onLoadFromUrl">加载 URL 字体</button>
      </div>
      <button @click="onDownload">下载 PDF</button>
    </section>
    <p class="hint">未上传字体时将使用内置拉丁字体，中文可能显示为方框。</p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { downloadPdf, type FontResource } from '../../../src';
import { buildFontResourceFromUrls } from '../../../src/utils/fontLoader';

const markdown = ref(`# 标题\n\n这是一段中文内容，用于展示中文字体注入后的显示与复制效果。`);

const fontRes = ref<FontResource | null>(null);
const fontUrl = ref('');

async function onFontUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  fontRes.value = {
    name: 'UserFont',
    normal: buf,
  };
}

async function onDownload() {
  await downloadPdf(markdown.value, 'example-cn.pdf', {
    fonts: fontRes.value ? [fontRes.value] : undefined,
    defaultFont: fontRes.value ? 'UserFont' : undefined,
  });
}

async function onLoadFromUrl() {
  if (!fontUrl.value) return;
  const res = await buildFontResourceFromUrls('RemoteFont', { normal: fontUrl.value });
  fontRes.value = res;
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
.font-remote input { width: 100%; }
textarea {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.hint { color: #666; }
button { width: fit-content; }
</style>


