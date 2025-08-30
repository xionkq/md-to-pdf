<h1>Markdown 功能测试文档</h1>

<p>这是一个用于测试 <strong>Markdown 转 PDF</strong> 功能的文件。<br>
请检查每种语法在 PDF 中的显示效果是否正确。</p>

<hr>

<h2>1. 标题</h2>
<h1>H1 标题</h1>
<h2>H2 标题</h2>
<h3>H3 标题</h3>
<h4>H4 标题</h4>
<h5>H5 标题</h5>
<h6>H6 标题</h6>

<hr>

<h2>2. 文本格式</h2>
<p>普通文字<br>
<em>斜体文字</em><br>
<strong>粗体文字</strong><br>
<del>删除线文字</del><br>
<code>行内代码</code></p>

<hr>

<h2>3. 段落 & 引用</h2>
<p>这是一个段落。</p>

<blockquote>
  <p>这是一个引用。<br>
  可以有多行。</p>
  <blockquote>
    <p>引用中嵌套引用。</p>
  </blockquote>
</blockquote>

<hr>

<h2>4. 列表</h2>

<h3>无序列表</h3>
<ul>
  <li>项目 A</li>
  <li>项目 B
    <ul>
      <li>子项目 B1</li>
      <li>子项目 B2</li>
    </ul>
  </li>
</ul>

<h3>有序列表</h3>
<ol>
  <li>第一项</li>
  <li>第二项
    <ol>
      <li>子项 2.1</li>
      <li>子项 2.2</li>
    </ol>
  </li>
  <li>第三项</li>
</ol>

<hr>

<h2>5. 链接 & 图片</h2>
<p><a href="https://github.com/xionkq/md-to-pdf">测试链接</a></p>
<p><img src="https://raw.githubusercontent.com/xionkq/my-blog/main/public/robin-building.png" alt="测试图片"></p>

<hr>

<h2>6. 代码块</h2>
<pre><code class="language-js">
// JavaScript 示例
function greet(name) {
  console.log(`Hello, ${name}!`);
}
greet("Markdown");
</code></pre>

<pre><code class="language-python">
# Python 示例
def add(a, b):
    return a + b

print(add(3, 5))
</code></pre>

<hr>

<h2>7. 表格</h2>
<table>
  <thead>
    <tr>
      <th>姓名</th><th>年龄</th><th>工作</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>小可爱</td><td>18</td><td>吃可爱多</td></tr>
    <tr><td>小小勇敢</td><td>20</td><td>爬棵勇敢树</td></tr>
    <tr><td>小小小机智</td><td>22</td><td>看一本机智书</td></tr>
  </tbody>
</table>

<hr>

<h2>8. 任务清单</h2>
<ul>
  <li>[x] 已完成任务</li>
  <li>[ ] 待完成任务</li>
  <li>[ ] 进行中的任务</li>
</ul>

<hr>

<h2>9. 分隔线</h2>
<hr>
<hr>
<hr>

<hr>

<h2>10. HTML 内嵌</h2>
<div style="color: red; font-weight: bold;">
这是 HTML 内容（用于测试 PDF 是否保留样式）。
</div>

<hr>

<h2>11. 数学公式（部分渲染器支持）</h2>
<p>行内公式：<code>E = mc^2</code></p>
<pre>
∫₀¹ x² dx = 1/3
</pre>

<hr>

<h2>12. 脚注 (HTML 版仅演示)</h2>
<p>这是一个带脚注的句子<sup>[1]</sup>。<br>
另一个脚注测试<sup>[2]</sup>。</p>
<ol>
  <li id="note1">这是脚注内容。</li>
  <li id="note2">脚注也可以包含<strong>格式</strong>，甚至包含列表：
    <ul>
      <li>列表项 1</li>
      <li>列表项 2</li>
    </ul>
  </li>
</ol>

<hr>

<h2>13. Emoji</h2>
<p>😀 😎 🚀 ✨ ✅ ❌</p>

<hr>

<h2>14. 混合测试</h2>
<p>这是一个综合测试：<br>
<strong>粗体</strong> + <em>斜体</em><br>
<a href="https://example.com">带链接的文字</a><br>
<code>内联代码</code></p>

<blockquote>
  <p>引用里也可以有 <strong>Markdown</strong>。</p>
</blockquote>

<hr>

<p>结束 🎉</p>
