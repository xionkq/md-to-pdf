<h1>HTML 嵌套语法测试</h1>

<p>本文件用于测试 <strong>Markdown 转换器</strong> 在处理各种语法 <strong>嵌套</strong> 时的表现。</p>

<hr>

<h2>1. 文本格式嵌套</h2>
<ul>
  <li><strong>粗体 + <em>斜体</em></strong></li>
  <li><em>斜体 + <strong>粗体</strong></em></li>
  <li><del>删除线中的 <code>代码</code></del></li>
  <li><strong>粗体里有 <code>内联代码</code></strong></li>
  <li><code>代码里包含 <strong>粗体</strong> 和 <em>斜体</em></code></li>
</ul>

<hr>

<h2>2. 引用中的嵌套</h2>
<blockquote>
  <p>这是一个引用，里面有：</p>
  <ul>
    <li>列表项 <strong>粗体</strong></li>
    <li>列表项 <em>斜体</em></li>
  </ul>
  <p>还可以嵌套代码：</p>
  <pre><code class="language-js">
console.log("引用中的代码块");
</code></pre>
  <blockquote>
    <p>二级引用 <em>斜体 + <strong>粗体</strong></em></p>
    <ul>
      <li>子列表项 1</li>
      <li>子列表项 2</li>
    </ul>
  </blockquote>
</blockquote>

<hr>

<h2>3. 列表中的嵌套</h2>
<ul>
  <li>无序列表项中有 <strong>粗体</strong>
    <ul>
      <li>子项中有 <em>斜体</em></li>
      <li>子项中有 <code>代码</code></li>
    </ul>
  </li>
</ul>

<ol>
  <li>第一项包含一个 <a href="https://example.com">链接</a></li>
  <li>第二项包含一个图片 <img src="https://markdown.com.cn/images/markdown-logo.png" alt="Logo"></li>
  <li>第三项包含一个代码块：
    <pre><code class="language-python">
def hello():
    print("列表中的代码块")
</code></pre>
  </li>
</ol>

<hr>

<h2>4. 表格中的嵌套</h2>
<table>
  <thead>
    <tr><th>列1</th><th>列2</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>粗体文本</strong></td><td><em>斜体文本</em></td></tr>
    <tr><td><code>代码单元格</code></td><td><a href="https://openai.com">链接</a></td></tr>
    <tr><td><del>删除线</del></td><td><img src="https://markdown.com.cn/images/markdown-logo.png" alt="图片"></td></tr>
  </tbody>
</table>

<hr>

<h2>5. 任务清单中的嵌套</h2>
<ul>
  <li>[x] 已完成任务，包含 <strong>粗体</strong></li>
  <li>[ ] 未完成任务，包含 <em>斜体</em></li>
  <li>[ ] 进行中的任务，包含 <a href="https://example.com">链接</a></li>
  <li>[ ] 代码示例：
    <pre><code class="language-bash">
echo "任务清单中的代码"
</code></pre>
  </li>
</ul>

<hr>

<h2>6. 混合嵌套</h2>
<ol>
  <li>列表项中有引用：
    <blockquote>
      <p><strong>引用里有粗体</strong></p>
      <ul>
        <li>列表</li>
        <li><a href="https://example.com">链接</a></li>
      </ul>
    </blockquote>
  </li>
  <li>列表项中有表格：
    <table>
      <tr><td><code>代码</code></td><td><em>斜体</em></td></tr>
      <tr><td><strong>粗体</strong></td><td><del>删除线</del></td></tr>
    </table>
  </li>
  <li>列表项中有任务清单：
    <ul>
      <li>[x] 任务 A</li>
      <li>[ ] 任务 B</li>
    </ul>
  </li>
</ol>

<hr>

<h2>7. 复杂混合</h2>
<blockquote>
  <p><strong>引用</strong></p>
  <ul>
    <li>列表
      <ul>
        <li>子项 <code>内联代码</code>
          <ul>
            <li><img src="https://markdown.com.cn/images/markdown-logo.png" alt="图片"></li>
            <li><a href="https://example.com">链接</a></li>
          </ul>
        </li>
      </ul>
    </li>
    <li>表格：
      <table>
        <tr><th>名称</th><th>值</th></tr>
        <tr><td><strong>A</strong></td><td><code>100</code></td></tr>
        <tr><td><em>B</em></td><td><del>200</del></td></tr>
      </table>
    </li>
    <li>任务清单：
      <ul>
        <li>[ ] <em>未完成任务</em></li>
        <li>[x] <strong>已完成任务</strong></li>
      </ul>
    </li>
  </ul>
</blockquote>

<hr>

<p>结束 🎉</p>
