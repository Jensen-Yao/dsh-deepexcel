/* Deepcel v2 — clean workbook chrome on top of the native DSH host.
   Skin-center v2 hooks facet: default export defineSkinHooks() returns
   { apply(ctx) }. Designed to be self-contained and robust: it builds a fixed
   Excel-style chrome (title bar, tabs, ribbon groups, formula row) and pushes
   the native host content below it. Settings / new-session / sidebar trigger
   the native buttons via aria-label, so no host services are required. */

const CLASS = {
  chrome: 'deepcelChrome',
  titleBar: 'deepcelTitleBar',
  qat: 'deepcelQat',
  docTitle: 'deepcelDocTitle',
  account: 'deepcelAccount',
  tabs: 'deepcelTabs',
  tab: 'deepcelTab',
  ribbon: 'deepcelRibbon',
  group: 'deepcelGroup',
  groupBody: 'deepcelGroupBody',
  groupTitle: 'deepcelGroupTitle',
  stack: 'deepcelGroupStack',
  cmd: 'deepcelCmd',
  cmdLg: 'deepcelCmdLg',
  formula: 'deepcelFormula',
  nameCell: 'deepcelNameCell',
  fx: 'deepcelFx',
  formulaInput: 'deepcelFormulaInput',
  sidebarArrow: 'deepcelSidebarArrow',
  grid: 'deepcelGrid',
  colHeader: 'deepcelColHeader',
  rowHeader: 'deepcelRowHeader',
  corner: 'deepcelCorner',
  cell: 'deepcelCell',
  status: 'deepcelStatus',
  arrowPanel: 'deepcelArrowPanel',
}

const RIBBON_TABS = [
  { id: 'file', label: '文件' },
  { id: 'home', label: '开始' },
  { id: 'insert', label: '插入' },
  { id: 'page-layout', label: '页面布局' },
  { id: 'formulas', label: '公式' },
  { id: 'data', label: '数据' },
  { id: 'review', label: '审阅' },
  { id: 'view', label: '视图' },
  { id: 'help', label: '帮助' },
]

// SVG paths for icons (fill-based, currentColor).
const ICON = {
  save: '<path d="M6 4h9l4 4v12H6V4zm2 2v4h7V6H8zm0 8h9v4H8v-4z"/>',
  undo: '<path d="M9 7 5 11l4 4v-3h6a3 3 0 0 1 0 6h-2v1.6h2a4.6 4.6 0 0 0 0-9.2H9V7z"/>',
  newWorkspace: '<path d="M6 8h5V6h8v12H5V8h1zm0 2v8h12V8H11v2H6z"/>',
  newSession: '<path d="M7 6h10v12H7V6zm2 3h6v2H9V9zm0 4h4v2H9v-2z"/>',
  settings: '<path d="M10 4h4l.7 2.4 2.1 1.2 2.4-.4 2 3.4-1.8 1.8v2.4l1.8 1.8-2 3.4-2.4-.4-2.1 1.2L14 20h-4l-.7-2.4-2.1-1.2-2.4.4-2-3.4 1.8-1.8V9.2L4.8 7.4l2-3.4 2.4.4L9.3 6.4 10 4zm2 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>',
  paste: '<path d="M8 3h2a2 2 0 0 1 4 0h2v3H8V3zm0 5h8v10H8V8zm2-3.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>',
  cut: '<path d="M7 17a2 2 0 1 1-2-2 2 2 0 0 1 2 2zm10 0a2 2 0 1 1-2-2 2 2 0 0 1 2 2zM5.8 14.4 14 4h1.5L7.2 14.6zm12.4 0L10.5 4H9l8.7 10.6z"/>',
  copy: '<path d="M8 5h9v12H8V5zm-3 3h2v11h8v2H5V8z"/>',
  brush: '<path d="M5 16c0-2 2-3 4-3l7-8 2 2-8 7c0 2-1 4-3 4s-2-1-2-2zm9.5-11.5 2 2"/>',
  font: '<path d="M7 18h2l1-3h4l1 3h2L13 6h-2L7 18zm3.7-5L12 8.8 13.3 13h-2.6z"/>',
  size: '<path d="M6 18V8h3v10H6zm5 0v-7h3v7h-3z"/>',
  bold: '<path d="M8 6h4.2a3 3 0 0 1 0 6H8V6zm0 6h4.8a3.2 3.2 0 0 1 0 6.4H8V12z"/>',
  italic: '<path d="M10 6h6v2h-2.2l-2.6 8H14v2H8v-2h2.2l2.6-8H10V6z"/>',
  underline: '<path d="M8 6v7.5a4 4 0 0 0 8 0V6h-2v7.5a2 2 0 0 1-4 0V6H8zm-1 12h10v1.5H7V18z"/>',
  fill: '<path d="M7 11 12 6l5 5-5 7-5-7zm1 8h8v1.6H8V19z"/>',
  color: '<path d="M7 16c0-3 5-9 5-9s5 6 5 9a5 5 0 0 1-10 0zm5 2.2A2.2 2.2 0 1 0 12 14a2.2 2.2 0 0 0 0 4.2z"/>',
  left: '<path d="M5 7h14v1.6H5V7zm0 4h10v1.6H5V11zm0 4h14v1.6H5V15z"/>',
  center: '<path d="M5 7h14v1.6H5V7zm3 4h8v1.6H8V11zm-3 4h14v1.6H5V15z"/>',
  right: '<path d="M5 7h14v1.6H5V7zm4 4h10v1.6H9V11zm-4 4h14v1.6H5V15z"/>',
  wrap: '<path d="M6 7h12v2H6V7zm0 4h9a3 3 0 0 1 0 6H9v2l-4-3 4-3v2h6a1 1 0 0 0 0-2H6v-2z"/>',
  merge: '<path d="M4 8h6V6l4 3-4 3V10H4V8zm16 8h-6v2l-4-3 4-3v2h6v2z"/>',
  general: '<path d="M8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/>',
  percent: '<path d="M8.2 16.8 15.8 7.2M9 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
  comma: '<path d="M7 8h3v8H7V8zm5 0h3v8h-3V8zm5 8.5L16 19h-1.4l1.2-2.5H17z"/>',
  decimal: '<path d="M8 8h8v2H8V8zm0 4h8v2H8v-2zm7 5.2a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2z"/>',
  conditional: '<path d="M6 6h12v3H6V6zm0 5h8v3H6v-3zm0 5h12v3H6v-3z"/>',
  table: '<path d="M5 6h14v12H5V6zm2 2v2h10V8H7zm0 4v2h4v-2H7zm6 0v2h4v-2h-4zM7 16v2h4v-2H7z"/>',
  style: '<path d="M7 6h10v3H7V6zm0 5h7v3H7v-3zm0 5h10v3H7v-3z"/>',
  insert: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z"/>',
  delete: '<path d="M8 7h8l-1 12H9L8 7zm2-2h4l.7 2H9.3L10 5zM5 7h14"/>',
  format: '<path d="M7 6h10v2H13v10h-2V8H7V6z"/>',
  sum: '<path d="M7 6h10v2.2l-6.4 4.8L17 17.8V20H7v-2h6.6L8 13.2 13.6 8H7V6z"/>',
  fill2: '<path d="M8 5h8v3l-2 3v8H10v-8L8 8V5z"/>',
  clear: '<path d="M7 7h10v2H7V7zm2 3h6l-1 9H10L9 10z"/>',
  sort: '<path d="M8 6h2l3 4H9.5V18H8.5V10H5l3-4zm8 12h-2l-3-4h3.5V6h1v8H19l-3 4z"/>',
  image: '<path d="M5 6h14v12H5V6zm2 8 3-3 2 2 3-4 3 5H7z"/>',
  shape: '<path d="M6 8h8v8H6V8zm6-2 6 6-6 6V6z"/>',
  chart: '<path d="M6 18V9h3v9H6zm5 0V6h3v12h-3zm5 0v-5h3v5h-3z"/>',
  link: '<path d="M9 12a4 4 0 0 1 4-4h3v2h-3a2 2 0 1 0 0 4h3v2h-3a4 4 0 0 1-4-4zm2 1h2v-2h-2v2zm-1-5h3v2h-3V8z"/>',
  comment: '<path d="M6 6h12v9H10l-4 3V6z"/>',
  header: '<path d="M6 6h12v2H6V6zm0 4h12v8H6v-8z"/>',
  theme: '<path d="M7 8a5 5 0 1 1 5 5H9l-2 3v-8zm5-3a3 3 0 0 0 0 6"/>',
  margin: '<path d="M6 6h12v12H6V6zm2 2v8h8V8H8z"/>',
  orient: '<path d="M8 5h5v14H8V5zm6 3h3v11h-3V8z"/>',
  page: '<path d="M8 4h6l4 4v12H8V4zm6 0v4h4"/>',
  break: '<path d="M5 11h14v2H5v-2zM8 6h8v3H8V6zm0 9h8v3H8v-3z"/>',
  width: '<path d="M5 12h14M8 9l-3 3 3 3m8-6 3 3-3 3"/>',
  height: '<path d="M12 5v14M9 8l3-3 3 3m-6 8 3 3 3-3"/>',
  zoom: '<path d="M10 6a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm7 12-3-3"/>',
  recent: '<path d="M12 6v6l4 2M12 4a8 8 0 1 1-8 8"/>',
  logic: '<path d="M7 7h4v4H7V7zm6 0h4v4h-4V7zM9 13h6v4H9v-4z"/>',
  lookup: '<path d="M10 6a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm8 13-4.2-4.2"/>',
  date: '<path d="M7 5h10v14H7V5zm0 4h10M10 5v3m4-3v3"/>',
  names: '<path d="M7 7h10v3H7V7zm0 5h10v3H7v-3zm0 5h6v2H7v-2z"/>',
  trace: '<path d="M6 18V8h4v10H6zm5-5 7-7m0 0h-4m4 0v4"/>',
  watch: '<path d="M12 7a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 3v4l3 2"/>',
  data: '<path d="M6 8h12v3H6V8zm0 5h12v3H6v-3zm0 5h8v2H6v-2z"/>',
  refresh: '<path d="M7 12a5 5 0 0 1 8.5-3.5L17 7v5h-5l2-2A3.5 3.5 0 1 0 15 14"/>',
  query: '<path d="M7 6h10v4H7V6zm0 6h10v8H7v-8zm3 2v4"/>',
  filter: '<path d="M6 6h12l-4 6v6l-4-2v-4L6 6z"/>',
  split: '<path d="M11 5v14m2-14v14M6 8h4v8H6V8zm8 0h4v8h-4V8z"/>',
  valid: '<path d="M6 12.5 10 17l8-9"/>',
  spell: '<path d="M7 17h2l1.2-3h3.6L15 17h2L13 6h-2L7 17zm3.8-5L12 8.4 13.2 12h-2.4z"/>',
  book: '<path d="M7 5h10v14H7V5zm2 2v10h6V7H9z"/>',
  translate: '<path d="M6 7h12M12 7v12M8 11h10M7 17h6"/>',
  lock: '<path d="M8 11V8a4 4 0 0 1 8 0v3h1v9H7v-9h1zm2 0h4V8a2 2 0 0 0-4 0v3z"/>',
  share: '<path d="M8 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8-5a2 2 0 1 1 0-4 2 2 0 0 1 0 3zM16 20a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM9.7 10.2l4.6-2.4M9.7 13.8l4.6 2.4"/>',
  normal: '<path d="M6 6h12v12H6V6zm2 2v8h8V8H8z"/>',
  layout: '<path d="M6 6h12v3H6V6zm0 5h5v7H6v-7zm7 0h5v7h-5v-7z"/>',
  grid: '<path d="M6 6h12v12H6V6zm0 4h12M6 14h12M10 6v12m4-12v12"/>',
  formula: '<path d="M8 6h8l-6 12h-2l6-12H8V6z"/>',
  help: '<path d="M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.8.4-1.2.8-1.2 1.8v.5h-1.6v-.6c0-1.4.7-2 1.6-2.4a1 1 0 1 0-1.4-1zm2 8.2a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>',
  info: '<path d="M12 7.5a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zM11 10h2v7h-2v-7z"/>',
}

// One ribbon group per tab (compact but Excel-like). Home carries the rich set.
const GROUP_BY_TAB = {
  home: [
    { title: '剪贴板', large: [{ id: 'paste', label: '粘贴', icon: 'paste' }], small: [{ id: 'cut', label: '剪切', icon: 'cut' }, { id: 'copy', label: '复制', icon: 'copy' }, { id: 'painter', label: '格式刷', icon: 'brush' }] },
    { title: '字体', large: [], small: [{ id: 'font', label: '字体', icon: 'font' }, { id: 'size', label: '12', icon: 'size' }, { id: 'bold', label: 'B', icon: 'bold' }, { id: 'italic', label: 'I', icon: 'italic' }, { id: 'underline', label: 'U', icon: 'underline' }, { id: 'fill', label: '填充', icon: 'fill' }, { id: 'color', label: '颜色', icon: 'color' }] },
    { title: '对齐方式', large: [{ id: 'merge', label: '合并居中', icon: 'merge' }], small: [{ id: 'left', label: '左对齐', icon: 'left' }, { id: 'center', label: '居中', icon: 'center' }, { id: 'right', label: '右对齐', icon: 'right' }, { id: 'wrap', label: '自动换行', icon: 'wrap' }] },
    { title: '数字', large: [], small: [{ id: 'general', label: '常规', icon: 'general' }, { id: 'percent', label: '%', icon: 'percent' }, { id: 'comma', label: '千分位', icon: 'comma' }, { id: 'decimal', label: '小数', icon: 'decimal' }] },
    { title: '样式', large: [], small: [{ id: 'conditional', label: '条件格式', icon: 'conditional' }, { id: 'table', label: '套用表格', icon: 'table' }, { id: 'style', label: '单元格样式', icon: 'style' }] },
    { title: '单元格', large: [], small: [{ id: 'insert', label: '插入', icon: 'insert' }, { id: 'delete', label: '删除', icon: 'delete' }, { id: 'format', label: '格式', icon: 'format' }] },
    { title: '编辑', large: [{ id: 'sum', label: '自动求和', icon: 'sum' }], small: [{ id: 'fill2', label: '填充', icon: 'fill2' }, { id: 'clear', label: '清除', icon: 'clear' }, { id: 'sort', label: '排序筛选', icon: 'sort' }] },
  ],
  insert: [
    { title: '表格', large: [{ id: 'chart', label: '数据透视', icon: 'table' }], small: [{ id: 'table2', label: '表格', icon: 'table' }, { id: 'picture', label: '图片', icon: 'image' }, { id: 'shape', label: '形状', icon: 'shape' }] },
    { title: '图表', large: [{ id: 'chart2', label: '推荐的图表', icon: 'chart' }], small: [{ id: 'column', label: '柱形图', icon: 'chart' }, { id: 'line', label: '折线图', icon: 'chart' }, { id: 'pie', label: '饼图', icon: 'chart' }] },
    { title: '链接', large: [], small: [{ id: 'link', label: '链接', icon: 'link' }, { id: 'comment', label: '批注', icon: 'comment' }, { id: 'header', label: '页眉页脚', icon: 'header' }] },
  ],
  'page-layout': [
    { title: '主题', large: [{ id: 'theme', label: '主题', icon: 'theme' }], small: [{ id: 'colors', label: '颜色', icon: 'color' }, { id: 'fonts', label: '字体', icon: 'font' }, { id: 'effects', label: '效果', icon: 'style' }] },
    { title: '页面设置', large: [], small: [{ id: 'margins', label: '页边距', icon: 'margin' }, { id: 'orient', label: '方向', icon: 'orient' }, { id: 'sizep', label: '纸张', icon: 'page' }, { id: 'break', label: '分隔符', icon: 'break' }] },
    { title: '调整为', large: [], small: [{ id: 'width', label: '宽度', icon: 'width' }, { id: 'height', label: '高度', icon: 'height' }, { id: 'scale', label: '缩放', icon: 'zoom' }] },
  ],
  formulas: [
    { title: '函数库', large: [{ id: 'sum2', label: '自动求和', icon: 'sum' }], small: [{ id: 'recent', label: '最近', icon: 'recent' }, { id: 'logic', label: '逻辑', icon: 'logic' }, { id: 'lookup', label: '查找引用', icon: 'lookup' }, { id: 'date', label: '日期时间', icon: 'date' }] },
    { title: '定义名称', large: [], small: [{ id: 'name-mgr', label: '名称管理器', icon: 'names' }, { id: 'define', label: '定义名称', icon: 'names' }] },
    { title: '公式审核', large: [], small: [{ id: 'trace-p', label: '追踪引用', icon: 'trace' }, { id: 'trace-d', label: '追踪从属', icon: 'trace' }, { id: 'watch', label: '监视窗口', icon: 'watch' }] },
  ],
  data: [
    { title: '获取与转换', large: [{ id: 'getdata', label: '获取数据', icon: 'data' }], small: [{ id: 'refresh', label: '全部刷新', icon: 'refresh' }, { id: 'queries', label: '查询', icon: 'query' }] },
    { title: '排序和筛选', large: [], small: [{ id: 'sort-az', label: '排序', icon: 'sort' }, { id: 'filter', label: '筛选', icon: 'filter' }, { id: 'advanced', label: '高级', icon: 'filter' }] },
    { title: '数据工具', large: [], small: [{ id: 'textcol', label: '分列', icon: 'split' }, { id: 'remove', label: '删除重复', icon: 'delete' }, { id: 'valid', label: '数据验证', icon: 'valid' }] },
  ],
  review: [
    { title: '校对', large: [{ id: 'spell', label: '拼写检查', icon: 'spell' }], small: [{ id: 'thesaurus', label: '同义词库', icon: 'book' }, { id: 'translate', label: '翻译', icon: 'translate' }] },
    { title: '批注', large: [{ id: 'new-comment', label: '新建批注', icon: 'comment' }], small: [{ id: 'show-c', label: '显示批注', icon: 'comment' }, { id: 'delete-c', label: '删除', icon: 'delete' }] },
    { title: '保护', large: [], small: [{ id: 'protect-s', label: '保护工作表', icon: 'lock' }, { id: 'protect-w', label: '保护工作簿', icon: 'lock' }, { id: 'share', label: '共享', icon: 'share' }] },
  ],
  view: [
    { title: '工作簿视图', large: [{ id: 'normal', label: '普通', icon: 'normal' }], small: [{ id: 'pagebreak', label: '分页预览', icon: 'page' }, { id: 'layout-v', label: '页面布局', icon: 'layout' }] },
    { title: '显示', large: [], small: [{ id: 'grid-l', label: '网格线', icon: 'grid' }, { id: 'headings', label: '标题', icon: 'header' }, { id: 'formula-bar', label: '编辑栏', icon: 'formula' }] },
    { title: '显示比例', large: [{ id: 'zoom', label: '缩放', icon: 'zoom' }], small: [{ id: 'zoom-sel', label: '缩放到选定', icon: 'zoom' }, { id: 'p100', label: '100%', icon: 'zoom' }] },
  ],
  help: [
    { title: '帮助', large: [{ id: 'help', label: '帮助', icon: 'help' }], small: [{ id: 'contact', label: '联系支持', icon: 'help' }, { id: 'feedback', label: '反馈', icon: 'comment' }, { id: 'about', label: '关于', icon: 'info' }] },
  ],
}

let CHROME_HEIGHT = 202 // px, updated at runtime; also set as CSS var

function icon(name) {
  const p = ICON[name] || ICON.general
  return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + p + '</svg>'
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== void 0) node.textContent = text
  return node
}

function buttonRow(className, iconName, label, onClick) {
  const b = el('button', className, '')
  b.innerHTML = icon(iconName) + '<span>' + label + '</span>'
  if (onClick) b.addEventListener('click', onClick)
  return b
}

function makeCmd(spec, large) {
  const b = el('button', large ? CLASS.cmdLg : CLASS.cmd)
  b.innerHTML = icon(spec.icon) + '<span>' + spec.label + '</span>'
  b.dataset.skinControl = spec.id
  return b
}

function makeGroup(spec) {
  const g = el('div', CLASS.group)
  const body = el('div', CLASS.groupBody)
  for (const item of spec.large || []) body.append(makeCmd(item, true))
  if ((spec.small || []).length) {
    const stack = el('div', CLASS.stack)
    for (const item of spec.small) stack.append(makeCmd(item, false))
    body.append(stack)
  }
  const title = el('div', CLASS.groupTitle, spec.title)
  g.append(body, title)
  return g
}

// --- native interactions (no host services available in skin-center ctx) ---

function clickNativeButton(labels, ariaLabels = []) {
  const b = [...document.querySelectorAll('button')].find((button) => {
    if (button.disabled || button.hasAttribute('data-skin-control')) return false
    const text = button.textContent?.trim() ?? ''
    const aria = button.getAttribute('aria-label') ?? ''
    return (labels.length && labels.includes(text)) || ariaLabels.includes(aria)
  })
  b?.click()
  return b
}

function nativeSettingsTrigger() {
  return [...document.querySelectorAll('button')].find((button) => {
    const text = button.textContent?.trim() ?? ''
    const aria = button.getAttribute('aria-label') ?? ''
    return (text === '设置' || text === 'Settings' || aria === '设置' || aria === 'Settings')
  })
}

function openSettings() {
  const trigger = nativeSettingsTrigger()
  if (trigger) {
    if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
  } else {
    clickNativeButton(['设置', 'Settings'], ['设置', 'Settings'])
  }
}

function newSession() {
  clickNativeButton(['新建会话', 'New session', '+ 新建会话'], ['新建会话', 'New session'])
}

function newWorkspace() {
  clickNativeButton(['添加工作区', 'Add workspace', '新建工作区'], ['添加工作区', 'Add workspace'])
}

let sidebarOpen = null

function toggleSidebar() {
  if (sidebarOpen === null) sidebarOpen = findSidebarOpen()
  sidebarOpen = !sidebarOpen
  applySidebar(sidebarOpen)
}

function findSidebarOpen() {
  const frame = sidebarFrame()
  return frame ? !frame.hasAttribute('data-sidebar-collapsed') : document.body.dataset.deepcelSidebar !== 'closed'
}

function sidebarFrame() {
  const sidebar = document.querySelector("#root [class*='sidebarCol']")
  return sidebar?.parentElement ?? null
}

function applySidebar(open) {
  const frame = sidebarFrame()
  if (frame instanceof HTMLElement) {
    if (open) frame.removeAttribute('data-sidebar-collapsed')
    else frame.setAttribute('data-sidebar-collapsed', '')
  }
  document.body.dataset.deepcelSidebar = open ? 'open' : 'closed'
  document.body.style.setProperty('--deepcel-sidebar-offset', open ? sidebarTargetWidth(frame) + 'px' : '0px')
  syncSidebarArrow()
}

function sidebarTargetWidth(frame) {
  if (!frame) return 0
  const v = Number.parseFloat(getComputedStyle(frame).width)
  return Number.isFinite(v) && v > 0 ? v : 280
}

function syncSidebarArrow() {
  const open = document.body.dataset.deepcelSidebar !== 'closed'
  const arrow = document.querySelector('[data-deepcel-sidebar-toggle]')
  if (arrow) arrow.textContent = open ? '◀' : '▶'
}

// --- chrome scaffolding ---

function buildChrome() {
  const chrome = el('div', CLASS.chrome)
  chrome.dataset.skinChrome = 'workbook'

  // title bar
  const titleBar = el('div', CLASS.titleBar)
  const qat = el('div', CLASS.qat)
  qat.append(buttonRow(CLASS.cmd, 'save', 'Save'), buttonRow(CLASS.cmd, 'undo', 'Undo'))
  titleBar.append(qat, el('div', CLASS.docTitle, 'DSH Workbook'), el('div', CLASS.account, 'Shared'))

  // tabs
  const tabs = el('div', CLASS.tabs)
  const tabNodes = new Map()
  for (const spec of RIBBON_TABS) {
    const t = el('button', CLASS.tab, spec.label)
    t.dataset.ribbonTab = spec.id
    t.addEventListener('click', () => setActiveTab(spec.id))
    tabNodes.set(spec.id, t)
    tabs.append(t)
  }

  // ribbon (rebuilt per tab)
  const ribbon = el('div', CLASS.ribbon)
  ribbon.dataset.deepcelRibbon = ''

  // formula row
  const formula = el('div', CLASS.formula)
  const nameCell = el('div', CLASS.nameCell, 'B4')
  const fx = el('div', CLASS.fx, 'fx')
  const formulaInput = el('input', CLASS.formulaInput)
  formulaInput.placeholder = '公式栏'
  formulaInput.setAttribute('aria-label', '公式栏')
  formula.append(nameCell, fx, formulaInput)

  chrome.append(titleBar, tabs, ribbon, formula)
  return { chrome, tabs, tabNodes, ribbon, formula, nameCell, formulaInput, titleBar }
}

function setActiveTab(id) {
  const chrome = document.querySelector('.' + CLASS.chrome)
  if (!chrome) return
  for (const t of chrome.querySelectorAll('[data-ribbon-tab]')) t.toggleAttribute('data-active', t.dataset.ribbonTab === id)
  const ribbon = chrome.querySelector('[data-deepcel-ribbon]')
  if (!ribbon) return
  ribbon.replaceChildren(...buildGroups(id))
}

function buildGroups(id) {
  if (id === 'file') return buildFileGroups()
  const groups = GROUP_BY_TAB[id] || []
  const out = groups.map(makeGroup)
  // every non-file tab ends with an "Add-ins · Exit" group that returns to the stock skin
  out.push(buildAddinsGroup())
  return out
}

function buildFileGroups() {
  const g = el('div', CLASS.group)
  const body = el('div', CLASS.groupBody)
  const ws = buttonRow(CLASS.cmdLg, 'newWorkspace', '新工作区', newWorkspace)
  const sess = buttonRow(CLASS.cmdLg, 'newSession', '新会话', newSession)
  const settings = buttonRow(CLASS.cmdLg, 'settings', '设置', openSettings)
  body.append(ws, sess, settings, buildAddinsButton())
  const title = el('div', CLASS.groupTitle, '工作簿')
  g.append(body, title)
  return [g]
}

function buildAddinsButton() {
  const b = el('button', CLASS.cmdLg + ' ' + CLASS.cmd)
  b.dataset.skinControl = 'addins'
  b.innerHTML = icon('settings') + '<span>加载项 · 退出</span>'
  b.addEventListener('click', restoreDefaultSkin)
  return b
}

function buildAddinsGroup() {
  const g = el('div', CLASS.group)
  const body = el('div', CLASS.groupBody)
  body.append(buildAddinsButton())
  const title = el('div', CLASS.groupTitle, '加载项')
  g.append(body, title)
  return g
}

function restoreDefaultSkin() {
  fetch('/api/skin-center/v2/active', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ active: null }),
  }).then(() => { window.location.reload() }).catch((error) => {
    console.error('[deepcel] restore active skin failed:', error)
  })
}

// --- grid: painted worksheet for the Excel look (visual layer only) ---

function columnLabel(index) {
  let n = index, out = ''
  while (n > 0) { const m = (n - 1) % 26; out = String.fromCharCode(65 + m) + out; n = Math.floor((n - 1) / 26) }
  return out
}

function buildGrid() {
  const grid = el('div', CLASS.grid)
  grid.dataset.skinChrome = 'grid'
  grid.setAttribute('aria-hidden', 'true')
  return grid
}

function layoutGrid(grid, columns, rows, sidebarOffset) {
  if (!(grid instanceof HTMLElement)) return
  const headerH = 20
  const rowH = 22
  const colW = 60
  grid.replaceChildren()

  const corner = el('div', CLASS.corner)
  corner.style.position = 'sticky'
  corner.style.left = '0'
  corner.style.top = '0'
  corner.style.zIndex = '3'
  corner.style.width = colW + 'px'
  corner.style.height = headerH + 'px'
  grid.append(corner)

  const colHead = el('div', CLASS.colHeader)
  colHead.style.position = 'sticky'
  colHead.style.top = '0'
  colHead.style.zIndex = '2'
  colHead.style.display = 'grid'
  colHead.style.gridTemplateColumns = `repeat(${columns}, ${colW}px)`
  colHead.style.height = headerH + 'px'
  for (let c = 1; c <= columns; c++) {
    const h = el('div', CLASS.cell, columnLabel(c))
    h.style.width = colW + 'px'
    h.style.height = headerH + 'px'
    h.classList.add('deepcelGridHeader')
    colHead.append(h)
  }
  grid.append(colHead)

  const rowHead = el('div', CLASS.rowHeader)
  rowHead.style.position = 'sticky'
  rowHead.style.left = '0'
  rowHead.style.zIndex = '2'
  rowHead.style.display = 'grid'
  rowHead.style.gridTemplateRows = `repeat(${rows}, ${rowH}px)`
  rowHead.style.width = colW + 'px'
  for (let r = 1; r <= rows; r++) {
    const h = el('div', CLASS.cell, String(r))
    h.style.height = rowH + 'px'
    h.style.width = colW + 'px'
    h.classList.add('deepcelGridHeader')
    rowHead.append(h)
  }
  grid.append(rowHead)

  // body cells
  const body = el('div', CLASS.cell)
  body.classList.add('deepcelGridBody')
  body.style.position = 'absolute'
  body.style.inset = `${headerH}px 0 0 ${colW}px`
  body.style.display = 'grid'
  body.style.gridTemplateColumns = `repeat(${columns}, ${colW}px)`
  body.style.gridTemplateRows = `repeat(${rows}, ${rowH}px)`
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    const cell = el('span', CLASS.cell)
    cell.style.width = colW + 'px'
    cell.style.height = rowH + 'px'
    cell.dataset.cell = `${columnLabel(c + 1)}${r + 1}`
    body.append(cell)
  }
  grid.append(body)
}

// --- fixed positioning: push native content below chrome, rebuild on resize ---

function applyChromeHeight() {
  const chrome = document.querySelector('.' + CLASS.chrome)
  if (!chrome) return
  const h = Math.round(chrome.getBoundingClientRect().height)
  if (Number.isFinite(h) && h > 0) {
    CHROME_HEIGHT = h
    document.documentElement.style.setProperty('--deepcel-chrome-height', h + 'px')
    document.documentElement.style.setProperty('--deepcel-ribbon-height', h + 'px')
  }
}

export default function defineSkinHooks() {
  return {
    apply(ctx) {
      try {
        const doc = document.documentElement
        doc.style.setProperty('--deepcel-chrome-height', CHROME_HEIGHT + 'px')
        doc.style.setProperty('--deepcel-ribbon-height', CHROME_HEIGHT + 'px')

        // pad native host content below the fixed chrome
        const pad = () => doc.style.setProperty('--deepcel-flow-padding-top', CHROME_HEIGHT + 'px')

        const { chrome, tabNodes, ribbon, nameCell, formulaInput } = buildChrome()
        chrome.append(buildSidebarArrow())
        document.body.prepend(chrome)

        // worksheet grid: a painted visual layer behind the native content
        const grid = buildGrid()
        document.body.prepend(grid)

        // default active tab
        setActiveTab('home')
        tabNodes.get('home')?.toggleAttribute('data-active', true)

        const recompute = () => {
          applyChromeHeight()
          pad()
          const colCount = Math.max(1, Math.floor(window.innerWidth / 60))
          const rowCount = Math.max(10, Math.floor((window.innerHeight - CHROME_HEIGHT) / 22) + 4)
          layoutGrid(grid, colCount, rowCount, 0)
        }
        recompute()
        const raf = () => requestAnimationFrame(() => { recompute(); requestAnimationFrame(recompute) })
        raf()

        window.addEventListener('resize', recompute)
        const observer = new MutationObserver(recompute)
        observer.observe(document.body, { childList: true, subtree: true })

        const onInput = () => { if (nameCell) nameCell.textContent = 'B4' }
        formulaInput?.addEventListener('input', onInput)

        // hide native hero composer's crowded toolbar so it reads as the sheet input
        doc.style.setProperty('--deepcel-hide-hero-tools', '1')

        ctx.onCleanup(() => {
          chrome.remove()
          grid.remove()
          window.removeEventListener('resize', recompute)
          observer.disconnect()
          doc.style.removeProperty('--deepcel-chrome-height')
          doc.style.removeProperty('--deepcel-ribbon-height')
        })
      } catch (error) {
        console.error('[deepcel] hooks apply failed:', error)
      }
    },
  }
}

function buildSidebarArrow() {
  const b = el('button', CLASS.sidebarArrow, '▶')
  b.dataset.skinControl = 'sidebar'
  b.dataset.deepcelSidebarToggle = ''
  b.title = '侧边栏'
  b.addEventListener('click', toggleSidebar)
  return b
}
