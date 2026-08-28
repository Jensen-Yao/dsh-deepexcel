/**
 * Deepcel Workbook — v2 skin hooks (x-org.linxin666.skin-center/v1alpha1).
 *
 * Port of the v1 plugin effects (src/client/index.ts) to the skin-center hooks
 * contract. Loading this module executes nothing; apply() owns every DOM write
 * and registers its retraction through ctx.onCleanup (idempotent, may run
 * 0/1/N times).
 *
 * v1 service → DOM adaptations (no cordis services in the hooks contract):
 *  - locale: read `document.documentElement.lang`, observe attribute changes.
 *  - layout.toggleSidebar(): click the native sidebar toggle button.
 *  - sessions: track the selected native session row element; workbook tabs
 *    store the row and click it to switch (title fallback, new-session last).
 *
 * Class names are plain (the skin-center loader force-scopes skin.css and
 * patches.css under html[data-dsh-skin="deepcel"]); no CSS modules here.
 */
export default function defineSkinHooks() {
  return {
    apply(ctx) {
      const body = document.body

      // ------------------------------------------------------------------
      // constants & tiny helpers
      // ------------------------------------------------------------------
      const SKIN_TITLE = 'Workbook Grid · DeepSeek Harness'

      const RIBBON_TABS = [
        { id: 'file', label: 'File' },
        { id: 'home', label: 'Home' },
        { id: 'manage', label: 'Manage' },
        { id: 'data', label: 'Data' },
        { id: 'review', label: 'Review' },
        { id: 'view', label: 'View' },
      ]
      const TOOL_CELLS = ['Filter', 'Sort', 'Merge', 'Format']
      const CELL_WIDTH = 60
      const ROW_HEIGHT = 24
      const ROW_GUTTER = 40
      const RIBBON_HEIGHT = 136
      const FORMULA_HEIGHT = 28
      const FORMULA_LINE_HEIGHT = 18
      const FORMULA_MAX_LINES = 6
      const STATUS_HEIGHT = 28
      const COMPOSER_WIDTH = 540
      const CHAT_WIDTH = 720
      const CONTENT_CELL_SELECTOR = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote', 'pre', 'hr', 'table',
        '.md-code-block', '.katex-display', '[class*="tableScroll"]', 'img',
        '[data-terminal]', '[data-variant="think"]', '[class*="actions"]', '[class*="stopped"]',
      ].join(', ')

      // All native entrypoints stay visible and clickable — the skin adds its
      // own workbook chrome but never hides the host's own controls (sidebar
      // tools, new session/workspace, settings, panel toggles). The workbook
      // ribbon buttons are extra shortcuts, not replacements.
      const NATIVE_ENTRY_SPECS = []

      // plain class names matching skin.css / patches.css
      const cls = (name) => name

      function currentRibbonHeight() {
        const value = Number.parseFloat(getComputedStyle(document.body).getPropertyValue('--deepcel-ribbon-height'))
        return Number.isFinite(value) && value > 0 ? value : RIBBON_HEIGHT
      }

      // ------------------------------------------------------------------
      // locale adapter (DOM lang attribute)
      // ------------------------------------------------------------------
      function readLocale() {
        const lang = (document.documentElement.getAttribute('lang') || 'zh').toLowerCase()
        return lang.startsWith('zh') ? 'zh' : 'en'
      }

      function labelsFor() {
        if (readLocale() === 'en') {
          return {
            file: 'File', conversation: 'Conversation', chat: 'Chat', sidebarShow: 'Show sidebar', sidebarHide: 'Hide sidebar',
            manage: 'Manage',
            newSession: 'New session', newWorkspace: 'New workspace', settings: 'Settings',
            newWorkbook: 'New workbook', addWorkbook: '+ Workbook', closeWorkbook: 'Close workbook',
            workspace: 'Workspace', preset: 'Agent preset',
            permission: 'Permission', model: 'Model', thinking: 'Thinking', confirm: 'Confirm', cancel: 'Cancel',
          }
        }
        return {
          file: '文件', conversation: '会话', chat: '对话', sidebarShow: '打开侧边栏', sidebarHide: '收起侧边栏',
          manage: '管理',
          newSession: '新会话', newWorkspace: '新工作区', settings: '设置',
          newWorkbook: '新建工作簿', addWorkbook: '+ 工作簿', closeWorkbook: '关闭工作簿',
          workspace: '工作区', preset: 'Agent 预设',
          permission: '权限', model: '模型', thinking: '思考', confirm: '确认', cancel: '取消',
        }
      }

      function localeStatus() {
        if (readLocale() === 'en') return 'English (US)'
        return document.documentElement.getAttribute('lang') || 'zh-CN'
      }

      // ------------------------------------------------------------------
      // native entrypoint helpers
      // ------------------------------------------------------------------
      function clickNativeButton(labels = [], ariaLabels = []) {
        const buttons = [...document.querySelectorAll('button:not([data-skin-control])')]
        const target = buttons.find((button) => {
          if (button.disabled) return false
          const text = button.textContent?.trim() ?? ''
          const aria = button.getAttribute('aria-label') ?? ''
          return labels.includes(text) || ariaLabels.includes(aria)
        })
        target?.click()
      }

      function nativeSidebarToggle() {
        return [...document.querySelectorAll('button:not([data-skin-control])')]
          .find((button) => {
            const aria = button.getAttribute('aria-label') ?? ''
            return ['打开侧边栏', '收起侧边栏', 'Open sidebar', 'Collapse sidebar'].includes(aria)
          })
      }

      function toggleSidebar() {
        const toggle = nativeSidebarToggle()
        if (toggle !== undefined) toggle.click()
      }

      /** Click the native bottom-panel toggle (expand/collapse) by aria-label. */
      function toggleBottomPanel() {
        const btn = [...document.querySelectorAll('button:not([data-skin-control])')]
          .find((b) => ['展开底部面板', '收起底部面板', '折叠底部面板', 'Expand bottom panel', 'Collapse bottom panel'].includes(b.getAttribute('aria-label') ?? ''))
        btn?.click()
      }

      /** Toggle the native details (right column) panel.
       *  The shell drives it through the frame's grid track and the
       *  data-details-collapsed attribute; when the native "close details"
       *  button exists the panel is open and we click it to close, otherwise
       *  we expand the track directly. */
      function toggleDetailsPanel() {
        const detailsCol = document.querySelector("[class*='detailsCol']")
        const frame = detailsCol?.parentElement
        const open = frame !== null && frame !== undefined && !frame.hasAttribute('data-details-collapsed')
        if (open) {
          const btn = [...document.querySelectorAll('button:not([data-skin-control])')]
            .find((b) => ['关闭详情', 'Close details'].includes(b.getAttribute('aria-label') ?? ''))
          if (btn !== undefined) { btn.click(); return }
          if (frame !== undefined) {
            frame.setAttribute('data-details-collapsed', '')
            const cols = (frame.style.gridTemplateColumns || '').trim().split(/\s+/)
            if (cols.length === 3) frame.style.gridTemplateColumns = `${cols[0]} ${cols[1]} 0px`
          }
          return
        }
        if (frame === null || frame === undefined) return
        frame.removeAttribute('data-details-collapsed')
        const cols = (frame.style.gridTemplateColumns || '').trim().split(/\s+/)
        if (cols.length === 3) frame.style.gridTemplateColumns = `${cols[0]} ${cols[1]} 360px`
      }

      function nativeSettingsTrigger() {
        return [...document.querySelectorAll('button:not([data-skin-control])')]
          .find((button) => {
            const text = button.textContent?.trim() ?? ''
            const aria = button.getAttribute('aria-label') ?? ''
            return button.getAttribute('aria-haspopup') === 'dialog'
              && (text === '设置' || text === 'Settings' || aria === '设置' || aria === 'Settings')
          })
      }

      function toggleNativeSettings() {
        const trigger = nativeSettingsTrigger()
        if (trigger?.getAttribute('aria-expanded') !== 'true') {
          if (trigger !== undefined) trigger.click()
          else clickNativeButton(['设置', 'Settings'], ['设置', 'Settings'])
          return
        }
        const dialog = document.querySelector("[role='dialog']")
        const close = [...dialog?.querySelectorAll('button') ?? []]
          .find((button) => ['关闭', 'Close'].includes(button.textContent?.trim() ?? ''))
        close?.click()
      }

      function activeComposer() {
        const composers = [...document.querySelectorAll('[data-composer-card]')]
        return composers.findLast((composer) => composer.isConnected) ?? null
      }

      function nativeHeroChoiceTriggers() {
        const row = document.querySelector("#root [data-phase='hero'] [class*='heroWorkspaceRow']") ?? undefined
        const buttons = [...row?.querySelectorAll("button[aria-haspopup='menu']:not([data-skin-control])") ?? []]
        const workspace = buttons.find((button) => button.parentElement === row)
          ?? buttons.find((button) => button.hasAttribute('aria-label'))
          ?? buttons[0]
        const preset = buttons.find((button) => button !== workspace)
        return { row, workspace, preset }
      }

      function nativeHeroChoiceTrigger(kind) {
        return nativeHeroChoiceTriggers()[kind]
      }

      function nativePermissionTrigger() {
        return activeComposer()?.querySelector("[class*='modes'] button:not([data-skin-control])") ?? undefined
      }

      function nativeModelTrigger() {
        return activeComposer()?.querySelector("[class*='trailing'] button[aria-haspopup='menu']:not([data-skin-control])") ?? undefined
      }

      function modelLabels() {
        const trigger = nativeModelTrigger()
        const labels = [...trigger?.querySelectorAll('span') ?? []]
          .map((label) => label.textContent?.trim() ?? '')
          .filter(Boolean)
        return { model: labels[0] ?? trigger?.title ?? '', thinking: labels[1] ?? '' }
      }

      function afterPaint() {
        return new Promise((resolve) => { requestAnimationFrame(() => { requestAnimationFrame(() => { resolve() }) }) })
      }

      function menuChoiceLabel(button) {
        const named = button.querySelector("[class*='modelName']")
          ?? button.querySelector("[class*='itemName']")
          ?? button.querySelector("[class*='optionCopy'] > span:first-child")
        return named?.textContent?.trim() || button.textContent?.trim() || ''
      }

      function controlledHeroChoiceMenu(trigger) {
        const id = trigger.getAttribute('aria-controls')
        if (id !== null) return document.getElementById(id)
        return [...document.querySelectorAll("[role='menu']")]
          .findLast((menu) => menu.querySelector("[role='menuitem'], [role='menuitemradio']") !== null) ?? null
      }

      async function heroChoices(kind) {
        const trigger = nativeHeroChoiceTrigger(kind)
        if (trigger === undefined || trigger.disabled) return []
        body.dataset.deepcelModelProbing = ''
        trigger.click()
        await afterPaint()
        const menu = controlledHeroChoiceMenu(trigger)
        const excluded = new Set(['Add workspace', '添加工作区'])
        const choices = [...menu?.querySelectorAll("[role='menuitem'], [role='menuitemradio']") ?? []]
          .filter((button) => !button.disabled)
          .map(menuChoiceLabel)
          .filter((label) => label !== '' && !excluded.has(label))
        trigger.click()
        await afterPaint()
        delete body.dataset.deepcelModelProbing
        return [...new Set(choices)]
      }

      async function applyHeroChoice(kind, label) {
        const trigger = nativeHeroChoiceTrigger(kind)
        if (trigger === undefined || trigger.disabled) return
        body.dataset.deepcelModelProbing = ''
        trigger.click()
        await afterPaint()
        const menu = controlledHeroChoiceMenu(trigger)
        const choice = [...menu?.querySelectorAll("[role='menuitem'], [role='menuitemradio']") ?? []]
          .find((button) => menuChoiceLabel(button) === label)
        choice?.click()
        if (choice === undefined) trigger.click()
        await afterPaint()
        delete body.dataset.deepcelModelProbing
      }

      function controlledModelMenu(trigger) {
        const id = trigger.getAttribute('aria-controls')
        if (id !== null) return document.getElementById(id)
        return [...document.querySelectorAll("[role='menu']")]
          .find((menu) => menu.querySelector("button[role='menuitem']") !== null) ?? null
      }

      function controlledPermissionMenu(trigger) {
        const id = trigger.getAttribute('aria-controls')
        if (id !== null) return document.getElementById(id)
        return [...document.querySelectorAll("[role='menu']")]
          .find((menu) => menu.querySelector("[role='menuitem'], [role='menuitemradio']") !== null) ?? null
      }

      async function permissionChoices() {
        const trigger = nativePermissionTrigger()
        if (trigger === undefined || trigger.disabled) return []
        body.dataset.deepcelModelProbing = ''
        trigger.click()
        await afterPaint()
        const menu = controlledPermissionMenu(trigger)
        const choices = [...menu?.querySelectorAll("[role='menuitem'], [role='menuitemradio']") ?? []]
          .map(menuChoiceLabel)
          .filter(Boolean)
        trigger.click()
        await afterPaint()
        delete body.dataset.deepcelModelProbing
        return choices
      }

      async function applyPermissionChoice(label) {
        const trigger = nativePermissionTrigger()
        if (trigger === undefined || trigger.disabled) return
        body.dataset.deepcelModelProbing = ''
        trigger.click()
        await afterPaint()
        const menu = controlledPermissionMenu(trigger)
        const choice = [...menu?.querySelectorAll("[role='menuitem'], [role='menuitemradio']") ?? []]
          .find((button) => menuChoiceLabel(button) === label)
        choice?.click()
        await afterPaint()
        delete body.dataset.deepcelModelProbing
      }

      async function modelChoices(kind) {
        const trigger = nativeModelTrigger()
        if (trigger === undefined || trigger.disabled) return []
        body.dataset.deepcelModelProbing = ''
        trigger.click()
        await afterPaint()
        const rootMenu = controlledModelMenu(trigger)
        const rows = [...rootMenu?.querySelectorAll("button[role='menuitem']") ?? []]
        rows[kind === 'model' ? 0 : 1]?.click()
        await afterPaint()
        const choices = [...rootMenu?.querySelectorAll("button[role='menuitemradio']") ?? []]
          .map(menuChoiceLabel)
          .filter(Boolean)
        trigger.click()
        await afterPaint()
        delete body.dataset.deepcelModelProbing
        return choices
      }

      async function applyModelChoice(kind, label) {
        const trigger = nativeModelTrigger()
        if (trigger === undefined || trigger.disabled) return
        body.dataset.deepcelModelProbing = ''
        trigger.click()
        await afterPaint()
        const rootMenu = controlledModelMenu(trigger)
        const rows = [...rootMenu?.querySelectorAll("button[role='menuitem']") ?? []]
        rows[kind === 'model' ? 0 : 1]?.click()
        await afterPaint()
        const choice = [...rootMenu?.querySelectorAll("button[role='menuitemradio']") ?? []]
          .find((button) => menuChoiceLabel(button) === label)
        choice?.click()
        await afterPaint()
        delete body.dataset.deepcelModelProbing
      }

      function concealNativeEntrypoints() {
        const buttons = [...document.querySelectorAll('button:not([data-skin-control])')]
        for (const button of buttons) {
          const text = button.textContent?.trim() ?? ''
          const aria = button.getAttribute('aria-label') ?? ''
          const matches = NATIVE_ENTRY_SPECS.some((spec) => spec.labels.includes(text) || spec.ariaLabels.includes(aria))
          if (matches) button.dataset.deepcelNativeProxy = ''
        }
        for (const composer of document.querySelectorAll('[data-composer-card]')) {
          composer.dataset.deepcelMergedInput = ''
          const inputRoot = composer.parentElement
          const footer = inputRoot?.lastElementChild
          if (footer instanceof HTMLElement && footer !== composer && footer.textContent?.trim() !== '') {
            footer.dataset.deepcelStatsSource = ''
          }
        }
        const heroRow = nativeHeroChoiceTriggers().row
        for (const source of document.querySelectorAll('[data-deepcel-hero-choice-source]')) {
          if (source !== heroRow) delete source.dataset.deepcelHeroChoiceSource
        }
        if (heroRow !== undefined) heroRow.dataset.deepcelHeroChoiceSource = ''
      }

      // ------------------------------------------------------------------
      // worksheet coordinates
      // ------------------------------------------------------------------
      function columnLabel(index) {
        let value = index + 1
        let label = ''
        while (value > 0) {
          value -= 1
          label = String.fromCharCode(65 + value % 26) + label
          value = Math.floor(value / 26)
        }
        return label
      }

      function makeCell(className, text) {
        const cell = document.createElement('span')
        cell.className = cls(className)
        cell.textContent = text
        return cell
      }

      function makeControl(className, action) {
        const control = document.createElement('button')
        control.type = 'button'
        control.className = cls(className)
        control.dataset.skinControl = action
        return control
      }

      function fillColumnCoordinates(columns) {
        const count = Math.ceil((window.innerWidth - ROW_GUTTER) / CELL_WIDTH) + 1
        const cells = [makeCell('cornerCell', '')]
        for (let index = 0; index < count; index += 1) {
          cells.push(makeCell('columnCell', columnLabel(index)))
        }
        columns.replaceChildren(...cells)
      }

      function fillRowCoordinates(rows, offset = 0) {
        const count = Math.ceil((window.innerHeight - currentRibbonHeight() - STATUS_HEIGHT) / ROW_HEIGHT) + 1
        const cells = []
        for (let index = 0; index <= count + 1; index += 1) {
          cells.push(makeCell('rowCell', String(offset + index)))
        }
        rows.replaceChildren(...cells)
      }

      function rangeName(range) {
        const start = `${columnLabel(range.columnStart)}${range.rowStart}`
        const end = `${columnLabel(range.columnEnd)}${range.rowEnd}`
        return start === end ? start : `${start}:${end}`
      }

      function hasOneVisualTextLine(element) {
        const range = document.createRange()
        range.selectNodeContents(element)
        if (typeof range.getClientRects !== 'function') return undefined
        const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
        if (rects.length === 0) return undefined
        const lineTops = []
        for (const rect of rects) {
          if (!lineTops.some((top) => Math.abs(top - rect.top) < 1)) lineTops.push(rect.top)
        }
        return lineTops.length === 1
      }

      // ------------------------------------------------------------------
      // worksheet surface
      // ------------------------------------------------------------------
      function createWorksheetSurface(nameCell) {
        const grid = document.createElement('div')
        grid.className = cls('worksheetGrid')
        grid.dataset.skinGrid = ''
        grid.setAttribute('aria-hidden', 'true')

        const selection = document.createElement('div')
        selection.className = cls('worksheetSelection')
        selection.dataset.skinSelection = ''
        selection.setAttribute('aria-hidden', 'true')

        let rowOffset = 0
        let scrollport = null
        let baselineScrollTop = 0
        let baselineFrame
        let reconcileFrame
        const messageElements = new Set()
        const dirtyMessages = new Set()
        const flowContainers = new Set()
        let composerSeat = null
        let selectedRangeElement = null
        let selectedRange = null

        const syncSelectionVisibility = () => {
          if (selectedRange === null) return
          const residual = Number.parseFloat(document.body.style.getPropertyValue('--deepcel-scroll-y')) || 0
          const top = currentRibbonHeight()
            + (selectedRange.rowStart - 1 - rowOffset) * ROW_HEIGHT
            + residual
          const bottom = top + (selectedRange.rowEnd - selectedRange.rowStart + 1) * ROW_HEIGHT
          selection.toggleAttribute(
            'data-active',
            bottom > currentRibbonHeight() && top < window.innerHeight - STATUS_HEIGHT,
          )
        }

        const clear = () => {
          selectedRange = null
          delete selection.dataset.active
          delete selection.dataset.overlay
          if (selectedRangeElement !== null) delete selectedRangeElement.dataset.deepcelSelectedRange
          selectedRangeElement = null
          nameCell.textContent = 'B4'
        }

        const updateRows = () => {
          const rows = document.querySelector('[data-skin-chrome="rows"]')
          if (rows === null) return
          const count = Math.ceil((window.innerHeight - currentRibbonHeight() - STATUS_HEIGHT) / ROW_HEIGHT) + 3
          if (rows.children.length !== count) {
            fillRowCoordinates(rows, rowOffset)
            return
          }
          for (let index = 0; index < count; index += 1) {
            const cell = rows.children.item(index)
            const label = String(rowOffset + index)
            if (cell !== null && cell.textContent !== label) cell.textContent = label
          }
        }

        const sizeMessage = (message) => {
          const contentHeight = Math.max(
            message.scrollHeight,
            ...[...message.children].map((child) => child instanceof HTMLElement ? child.scrollHeight : 0),
          )
          const text = message.textContent?.trim() ?? ''
          const visualSingleLine = hasOneVisualTextLine(message)
          const singleLine = text !== '' && !text.includes('\n')
            && (visualSingleLine ?? contentHeight <= ROW_HEIGHT * 1.5)
          const height = singleLine
            ? ROW_HEIGHT
            : Math.max(ROW_HEIGHT, Math.ceil(contentHeight / ROW_HEIGHT) * ROW_HEIGHT)
          const value = `${height}px`
          if (message.style.getPropertyValue('--deepcel-message-height') !== value) {
            message.style.setProperty('--deepcel-message-height', value)
          }
          message.style.setProperty('--deepcel-message-rows', String(height / ROW_HEIGHT))
          if (singleLine) message.dataset.deepcelSingleLine = ''
          else delete message.dataset.deepcelSingleLine
          message.dataset.deepcelMessageRange = ''
        }

        const clearMessageCells = (message) => {
          delete message.dataset.deepcelCellized
          for (const element of message.querySelectorAll('[data-deepcel-content-cell]')) {
            delete element.dataset.deepcelContentCell
            delete element.dataset.deepcelSingleLine
            element.style.removeProperty('--deepcel-content-cell-height')
            element.style.removeProperty('--deepcel-content-cell-rows')
          }
          for (const element of message.querySelectorAll('[data-deepcel-cell-container]')) {
            delete element.dataset.deepcelCellContainer
          }
        }

        const sizeContentCell = (cell) => {
          cell.dataset.deepcelContentCell = ''
          cell.style.removeProperty('--deepcel-content-cell-height')
          const contentHeight = Math.max(cell.scrollHeight, cell.getBoundingClientRect().height)
          const height = Math.max(ROW_HEIGHT, Math.ceil(contentHeight / ROW_HEIGHT) * ROW_HEIGHT)
          cell.style.setProperty('--deepcel-content-cell-height', `${height}px`)
          cell.style.setProperty('--deepcel-content-cell-rows', String(height / ROW_HEIGHT))
          if (height === ROW_HEIGHT) cell.dataset.deepcelSingleLine = ''
          else delete cell.dataset.deepcelSingleLine
        }

        const syncMessageCells = (message) => {
          clearMessageCells(message)
          if (message.querySelector("[class*='userRow']") !== null) return

          const producedFilesRoot = message.querySelector('[data-produced-files-row]')?.parentElement
          const shellSummary = message.querySelector("[data-sample='bash'][data-variant='bash']")
          const shellBody = shellSummary?.nextElementSibling
          const shellBodyCells = shellBody === null || shellBody === undefined
            ? []
            : [...shellBody.children].filter((child) => child instanceof HTMLElement)
          const candidates = [...new Set([
            ...(producedFilesRoot === undefined ? [] : [producedFilesRoot]),
            ...(shellSummary === null ? [] : [shellSummary, ...shellBodyCells]),
            ...message.querySelectorAll(CONTENT_CELL_SELECTOR),
          ])]
            .filter((candidate) => {
              const ancestor = candidate.parentElement?.closest(CONTENT_CELL_SELECTOR)
              return ancestor === null || ancestor === undefined || !message.contains(ancestor)
            })
          if (candidates.length === 0) return

          message.dataset.deepcelCellized = ''
          for (const cell of candidates) {
            let container = cell.parentElement
            while (container !== null && container !== message) {
              container.dataset.deepcelCellContainer = ''
              container = container.parentElement
            }
            sizeContentCell(cell)
          }
          sizeMessage(message)
        }

        const messageResizeObserver = typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver((entries) => {
              for (const entry of entries) {
                if (entry.target instanceof HTMLElement) sizeMessage(entry.target)
              }
            })

        const syncMessages = () => {
          const live = new Set(document.querySelectorAll('[data-chat-flow-kind]'))
          for (const message of live) {
            if (messageElements.has(message)) continue
            syncMessageCells(message)
            sizeMessage(message)
            messageResizeObserver?.observe(message)
          }
          for (const message of messageElements) {
            if (live.has(message)) continue
            messageResizeObserver?.unobserve(message)
            clearMessageCells(message)
            delete message.dataset.deepcelMessageRange
            delete message.dataset.deepcelSingleLine
            message.style.removeProperty('--deepcel-message-height')
            message.style.removeProperty('--deepcel-message-rows')
          }
          messageElements.clear()
          for (const message of live) messageElements.add(message)
          for (const message of dirtyMessages) {
            if (live.has(message)) syncMessageCells(message)
          }
          dirtyMessages.clear()
        }

        const sizeComposer = () => {
          if (composerSeat === null) return
          const card = composerSeat.querySelector('[data-composer-card]')
          const contentHeight = Math.max(
            composerSeat.scrollHeight,
            card?.scrollHeight ?? 0,
            card?.getBoundingClientRect().height ?? 0,
          )
          composerSeat.style.setProperty(
            '--deepcel-composer-rows',
            String(Math.max(1, Math.ceil(contentHeight / ROW_HEIGHT))),
          )
          composerSeat.dataset.deepcelComposerRange = ''
        }

        const composerResizeObserver = typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(() => { sizeComposer() })

        const syncFlowLayout = () => {
          const nextContainers = new Set()
          const flow = scrollport?.querySelector('[data-chat-flow]') ?? null
          if (scrollport !== null) {
            if (flow === null) delete scrollport.dataset.deepcelWorkbookFlow
            else scrollport.dataset.deepcelWorkbookFlow = ''
          }
          let container = flow
          while (container !== null && container !== scrollport) {
            nextContainers.add(container)
            container = container.parentElement
          }
          for (const previous of flowContainers) {
            if (!nextContainers.has(previous)) delete previous.dataset.deepcelFlowContainer
          }
          for (const current of nextContainers) current.dataset.deepcelFlowContainer = ''
          flowContainers.clear()
          for (const current of nextContainers) flowContainers.add(current)

          const nextComposer = flow === null
            ? null
            : scrollport?.querySelector('[data-composer-seat]') ?? null
          if (nextComposer !== composerSeat) {
            if (composerSeat !== null) {
              composerResizeObserver?.unobserve(composerSeat)
              delete composerSeat.dataset.deepcelComposerRange
              composerSeat.style.removeProperty('--deepcel-composer-rows')
            }
            composerSeat = nextComposer
            if (composerSeat !== null) composerResizeObserver?.observe(composerSeat)
          }
          sizeComposer()

          if (scrollport !== null && flow !== null) {
            const top = scrollport.getBoundingClientRect().top
            const ribbonHeight = currentRibbonHeight()
            const phase = ((top - ribbonHeight) % ROW_HEIGHT + ROW_HEIGHT) % ROW_HEIGHT
            scrollport.style.setProperty('--deepcel-flow-padding-top', `${(ROW_HEIGHT - phase) % ROW_HEIGHT}px`)
          } else {
            scrollport?.style.removeProperty('--deepcel-flow-padding-top')
          }
        }

        const syncScrollCoordinates = () => {
          if (scrollport === null) return
          const delta = scrollport.scrollTop - baselineScrollTop
          const nextOffset = Math.trunc(delta / ROW_HEIGHT)
          const residual = delta - nextOffset * ROW_HEIGHT
          document.body.style.setProperty('--deepcel-scroll-y', `${-residual}px`)
          document.body.style.setProperty('--deepcel-row-offset', String(nextOffset))
          document.body.style.setProperty('--deepcel-row-offset-y', `${-nextOffset * ROW_HEIGHT}px`)
          if (nextOffset !== rowOffset) {
            rowOffset = nextOffset
            updateRows()
          }
          syncSelectionVisibility()
        }

        const onScroll = () => {
          syncScrollCoordinates()
        }

        const bindScrollport = () => {
          const next = document.querySelector("[data-phase='active'] [data-conversation-scroll]")
          if (next === scrollport) {
            syncFlowLayout()
            syncMessages()
            return
          }
          scrollport?.removeEventListener('scroll', onScroll)
          scrollport?.style.removeProperty('--deepcel-flow-padding-top')
          scrollport = next
          rowOffset = 0
          document.body.style.setProperty('--deepcel-scroll-y', '0px')
          document.body.style.setProperty('--deepcel-row-offset', '0')
          document.body.style.setProperty('--deepcel-row-offset-y', '0px')
          updateRows()
          syncSelectionVisibility()
          if (scrollport === null) {
            syncFlowLayout()
            return
          }
          baselineScrollTop = scrollport.scrollTop
          scrollport.addEventListener('scroll', onScroll, { passive: true })
          if (baselineFrame !== undefined) cancelAnimationFrame(baselineFrame)
          baselineFrame = requestAnimationFrame(() => {
            baselineFrame = requestAnimationFrame(() => {
              baselineFrame = undefined
              if (scrollport === null) return
              baselineScrollTop = scrollport.scrollTop
              syncScrollCoordinates()
            })
          })
          syncFlowLayout()
          syncMessages()
        }

        const resize = () => {
          const columns = Math.ceil((window.innerWidth - ROW_GUTTER) / CELL_WIDTH) + 1
          const rows = Math.ceil((window.innerHeight - currentRibbonHeight() - STATUS_HEIGHT) / ROW_HEIGHT) + 3
          const centeredSpace = Math.max(0, window.innerWidth - ROW_GUTTER - COMPOSER_WIDTH) / 2
          const composerColumn = Math.max(0, Math.round(centeredSpace / CELL_WIDTH))
          const centeredChatSpace = Math.max(0, window.innerWidth - ROW_GUTTER - CHAT_WIDTH) / 2
          const chatColumn = Math.max(0, Math.round(centeredChatSpace / CELL_WIDTH))
          const cells = []
          for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
              const cell = document.createElement('span')
              cell.className = cls('worksheetCell')
              cell.dataset.cell = `${columnLabel(column)}${rowOffset + row}`
              cells.push(cell)
            }
          }
          grid.style.setProperty('--deepcel-grid-columns', String(columns))
          document.body.style.setProperty('--deepcel-composer-x', `${composerColumn * CELL_WIDTH}px`)
          document.body.style.setProperty('--deepcel-chat-x', `${chatColumn * CELL_WIDTH}px`)
          grid.replaceChildren(...cells)
          for (const message of messageElements) syncMessageCells(message)
          bindScrollport()
          syncSelectionVisibility()
        }

        const select = (range, overlay = false, element, segment = '') => {
          selectedRange = range
          if (selectedRangeElement !== element) {
            if (selectedRangeElement !== null) delete selectedRangeElement.dataset.deepcelSelectedRange
            selectedRangeElement = element ?? null
            if (selectedRangeElement !== null) selectedRangeElement.dataset.deepcelSelectedRange = segment
          }
          selection.dataset.active = ''
          if (overlay) selection.dataset.overlay = ''
          else delete selection.dataset.overlay
          selection.style.setProperty('--deepcel-selection-x', `${range.columnStart * CELL_WIDTH}px`)
          selection.style.setProperty('--deepcel-selection-y', `${(range.rowStart - 1) * ROW_HEIGHT}px`)
          selection.style.setProperty('--deepcel-selection-width', `${(range.columnEnd - range.columnStart + 1) * CELL_WIDTH}px`)
          selection.style.setProperty('--deepcel-selection-height', `${(range.rowEnd - range.rowStart + 1) * ROW_HEIGHT}px`)
          nameCell.textContent = rangeName(range)
          syncSelectionVisibility()
        }

        const onSheetClick = (event) => {
          if (!(event.target instanceof HTMLElement)) return
          if (event.target.closest('[data-skin-chrome], [role="dialog"]') !== null) return
          if (event.target.closest('#root [data-phase], #root [data-conversation-scroll]') === null) return
          const sidebarOffset = Number.parseFloat(document.body.style.getPropertyValue('--deepcel-sidebar-offset')) || 0
          const origin = sidebarOffset + ROW_GUTTER
          const ribbonHeight = currentRibbonHeight()
          if (event.clientX < origin || event.clientY < ribbonHeight || event.clientY >= window.innerHeight - STATUS_HEIGHT) return

          const heroHeadline = event.target.closest(
            "[data-phase='hero'] [class*='headline']:has(> [class*='headlineText'])",
          )
          const heroHeadlineRect = heroHeadline?.getBoundingClientRect()
          if (heroHeadline !== null && heroHeadline !== undefined
            && heroHeadlineRect !== undefined && heroHeadlineRect.width > 0 && heroHeadlineRect.height > 0) {
            const relativeX = event.clientX - heroHeadlineRect.left
            const title = heroHeadline.querySelector("[class*='headlineText']")
            const preview = heroHeadline.querySelector("[class*='previewBadge']")
            const segment = relativeX < CELL_WIDTH
              ? { start: heroHeadlineRect.left, end: heroHeadlineRect.left + CELL_WIDTH, element: heroHeadline, kind: 'formula' }
              : relativeX >= heroHeadlineRect.width - CELL_WIDTH
                ? { start: heroHeadlineRect.right - CELL_WIDTH, end: heroHeadlineRect.right, element: preview, kind: 'preview' }
                : { start: heroHeadlineRect.left + CELL_WIDTH, end: heroHeadlineRect.right - CELL_WIDTH, element: title, kind: 'title' }
            if (segment.element === null) return
            select({
              columnStart: Math.max(0, Math.floor((segment.start - origin) / CELL_WIDTH)),
              columnEnd: Math.max(0, Math.ceil((segment.end - origin) / CELL_WIDTH) - 1),
              rowStart: Math.max(1, Math.floor((heroHeadlineRect.top - ribbonHeight) / ROW_HEIGHT) + 1),
              rowEnd: Math.max(1, Math.ceil((heroHeadlineRect.bottom - ribbonHeight) / ROW_HEIGHT)),
            }, true, segment.element, segment.kind)
            return
          }

          const composer = event.target.closest('[data-composer-card]')
          const rect = composer?.getBoundingClientRect()
          if (composer !== null && composer !== undefined && rect !== undefined && rect.width > 0 && rect.height > 0) {
            select({
              columnStart: Math.max(0, Math.floor((rect.left - origin) / CELL_WIDTH)),
              columnEnd: Math.max(0, Math.ceil((rect.right - origin) / CELL_WIDTH) - 1),
              rowStart: Math.max(1, Math.floor((rect.top - ribbonHeight) / ROW_HEIGHT) + 1),
              rowEnd: Math.max(1, Math.ceil((rect.bottom - ribbonHeight) / ROW_HEIGHT)),
            })
            return
          }

          const column = Math.floor((event.clientX - origin) / CELL_WIDTH)
          const scrollY = Number.parseFloat(document.body.style.getPropertyValue('--deepcel-scroll-y')) || 0
          const row = rowOffset + Math.floor((event.clientY - ribbonHeight - scrollY) / ROW_HEIGHT) + 1
          select({ columnStart: column, columnEnd: column, rowStart: row, rowEnd: row })
        }

        document.addEventListener('click', onSheetClick, true)
        const worksheetObserver = new MutationObserver((records) => {
          for (const record of records) {
            const target = record.target instanceof HTMLElement ? record.target : record.target.parentElement
            const message = target?.closest('[data-chat-flow-kind]')
            if (message !== null && message !== undefined) dirtyMessages.add(message)
            for (const node of record.addedNodes) {
              if (!(node instanceof HTMLElement)) continue
              const addedMessage = node.matches('[data-chat-flow-kind]')
                ? node
                : node.closest('[data-chat-flow-kind]')
              if (addedMessage !== null) dirtyMessages.add(addedMessage)
            }
          }
          if (reconcileFrame !== undefined) return
          reconcileFrame = requestAnimationFrame(() => {
            reconcileFrame = undefined
            bindScrollport()
          })
        })
        worksheetObserver.observe(document.body, { childList: true, subtree: true })
        resize()
        return {
          grid,
          selection,
          clear,
          resize,
          dispose() {
            document.removeEventListener('click', onSheetClick, true)
            worksheetObserver.disconnect()
            scrollport?.removeEventListener('scroll', onScroll)
            if (baselineFrame !== undefined) cancelAnimationFrame(baselineFrame)
            if (reconcileFrame !== undefined) cancelAnimationFrame(reconcileFrame)
            messageResizeObserver?.disconnect()
            composerResizeObserver?.disconnect()
            for (const message of messageElements) {
              clearMessageCells(message)
              delete message.dataset.deepcelMessageRange
              delete message.dataset.deepcelSingleLine
              message.style.removeProperty('--deepcel-message-height')
              message.style.removeProperty('--deepcel-message-rows')
            }
            for (const container of flowContainers) delete container.dataset.deepcelFlowContainer
            if (composerSeat !== null) {
              delete composerSeat.dataset.deepcelComposerRange
              composerSeat.style.removeProperty('--deepcel-composer-rows')
            }
            scrollport?.style.removeProperty('--deepcel-flow-padding-top')
            if (scrollport !== null) delete scrollport.dataset.deepcelWorkbookFlow
            document.body.style.removeProperty('--deepcel-composer-x')
            document.body.style.removeProperty('--deepcel-chat-x')
            document.body.style.removeProperty('--deepcel-scroll-y')
            document.body.style.removeProperty('--deepcel-row-offset')
            document.body.style.removeProperty('--deepcel-row-offset-y')
            if (selectedRangeElement !== null) delete selectedRangeElement.dataset.deepcelSelectedRange
            grid.remove()
            selection.remove()
          },
        }
      }

      // ------------------------------------------------------------------
      // workbook chrome
      // ------------------------------------------------------------------
      function createWorkbookChrome() {
        const chrome = document.createElement('div')
        chrome.className = cls('workbookChrome')
        chrome.dataset.skinChrome = 'workbook'

        const titleRow = document.createElement('div')
        titleRow.className = cls('titleRow')
        const titleCell = makeCell('titleCell', 'DSH Workbook')
        const headerControls = document.createElement('div')
        headerControls.className = cls('headerControls')
        headerControls.dataset.headerControls = ''
        titleRow.append(
          makeCell('quickCell', 'Save'),
          makeCell('quickCell', 'Undo'),
          headerControls,
          titleCell,
          makeCell('accountCell', 'Shared'),
        )

        const tabs = document.createElement('div')
        tabs.className = cls('ribbonTabs')
        const ribbonTabs = new Map()
        for (const spec of RIBBON_TABS) {
          const tab = makeControl('ribbonTab', `ribbon-${spec.id}`)
          tab.textContent = spec.label
          tab.dataset.ribbonTab = spec.id
          if (spec.id === 'home') tab.hidden = true
          tab.addEventListener('click', () => {
            chrome.dispatchEvent(new CustomEvent('deepcel-ribbon-change', { detail: spec.id }))
          })
          ribbonTabs.set(spec.id, tab)
          tabs.append(tab)
        }

        const tools = document.createElement('div')
        tools.className = cls('toolRow')
        const newSession = makeControl('toolCell', 'new-session')
        const newWorkspace = makeControl('toolCell', 'new-workspace')
        newWorkspace.addEventListener('click', () => {
          clickNativeButton([], ['添加工作区', 'Add workspace'])
        })
        const settings = makeControl('toolCell', 'settings')
        settings.addEventListener('click', toggleNativeSettings)
        const workspace = makeControl('toolCell', 'workspace')
        const preset = makeControl('toolCell', 'preset')
        const permission = makeControl('toolCell', 'permission')
        const model = makeControl('toolCell', 'model')
        const thinking = makeControl('toolCell', 'thinking')
        for (const label of TOOL_CELLS) tools.append(makeCell('toolCell', label))

        const formula = document.createElement('div')
        formula.className = cls('formulaRow')
        const nameCell = makeCell('nameCell', 'B4')
        nameCell.dataset.cellName = ''
        const formulaCell = makeCell('formulaCell', '')
        formula.append(
          nameCell,
          makeCell('formulaLabel', 'fx'),
          formulaCell,
        )

        const columns = document.createElement('div')
        columns.className = cls('columnRow')
        fillColumnCoordinates(columns)

        chrome.append(titleRow, tabs, tools, formula, columns)
        return {
          chrome,
          columns,
          controls: {
            ribbonTabs, tools, formulaCell, titleCell, headerControls, newSession, newWorkspace, settings,
            workspace, preset, permission, model, thinking,
          },
          nameCell,
        }
      }

      function createRowChrome() {
        const rows = document.createElement('div')
        rows.className = cls('rowChrome')
        rows.dataset.skinChrome = 'rows'
        rows.setAttribute('aria-hidden', 'true')
        fillRowCoordinates(rows)
        return rows
      }

      function findShellParts() {
        const sidebar = document.querySelector("#root [class*='sidebarCol']")
        const frame = sidebar?.parentElement
        if (sidebar === null || sidebar === undefined || frame === null || frame === undefined) return undefined
        return { frame, sidebar }
      }

      function sidebarTargetWidth(frame, sidebar) {
        const firstTrack = /^([0-9]+(?:\.[0-9]+)?)px(?:\s|$)/.exec(frame.style.gridTemplateColumns.trim())
        return Math.round(firstTrack === null ? sidebar.getBoundingClientRect().width : Number(firstTrack[1]))
      }

      function createStatusChrome() {
        const footer = document.createElement('div')
        footer.className = cls('statusChrome')
        footer.dataset.skinChrome = 'status'
        const sidebar = makeControl('sheetNavCell', 'sidebar')
        sidebar.addEventListener('click', toggleSidebar)
        const bottomPanel = makeControl('statusCell', 'bottom-panel')
        bottomPanel.textContent = '面板'
        bottomPanel.title = '打开/收起底部面板'
        bottomPanel.addEventListener('click', toggleBottomPanel)
        const details = makeControl('statusCell', 'details-panel')
        details.textContent = '详情'
        details.title = '打开/收起右侧详情'
        details.addEventListener('click', toggleDetailsPanel)
        const workbookTabs = document.createElement('div')
        workbookTabs.className = cls('workbookTabs')
        workbookTabs.setAttribute('role', 'tablist')
        const addWorkbook = makeControl('newSheetCell', 'new-workbook')
        const language = makeCell('statusCell', localeStatus())
        language.dataset.localeStatus = ''
        const statistics = makeCell('statisticsCell', '')
        statistics.dataset.statisticsStatus = ''
        footer.append(
          sidebar,
          bottomPanel,
          details,
          workbookTabs,
          addWorkbook,
          makeCell('statusSpacer', ''),
          makeCell('statusCell', 'Ready'),
          statistics,
          language,
          makeCell('zoomCell', '-  100%  +'),
        )
        return { footer, sidebar, workbookTabs, addWorkbook, language, statistics }
      }

      function activeSessionHeader() {
        return document.querySelector("#root [data-phase='active'] > header")
      }

      function selectedNativeSessionRow() {
        return document.querySelector("#root [class*='sessionRow'][role='treeitem'][aria-selected='true']") ?? undefined
      }

      function proxyButton(source, text, action) {
        const proxy = makeControl('toolCell', action)
        proxy.textContent = text
        proxy.disabled = source.disabled
        proxy.setAttribute('aria-pressed', source.getAttribute('aria-selected') ?? 'false')
        proxy.addEventListener('click', () => { source.click() })
        return proxy
      }

      function currentSessionTitle(header) {
        const navigation = header.querySelector('nav')
        const current = navigation?.querySelector('button:disabled')
          ?? navigation?.querySelector('button:last-of-type')
        return current?.textContent?.trim() || navigation?.textContent?.trim() || ''
      }

      function headerActionProjections(actions) {
        if (actions === null || actions === undefined) return []
        const projections = []
        for (const entry of actions.children) {
          const buttons = entry instanceof HTMLButtonElement
            ? [entry]
            : [...entry.querySelectorAll('button')]
          if (buttons.length > 0) {
            for (const button of buttons) {
              const label = button.textContent?.trim() || button.getAttribute('aria-label') || ''
              if (label !== '') projections.push({ label, source: button })
            }
            continue
          }
          const label = entry.textContent?.trim() ?? ''
          if (label !== '') projections.push({ label })
        }
        return projections
      }

      function createChoiceDialog(kind, labels, choices, current, onConfirm, onClose) {
        const overlay = document.createElement('div')
        overlay.className = cls('choiceOverlay')
        overlay.dataset.deepcelChoiceDialog = kind
        const dialog = document.createElement('section')
        dialog.className = cls('choiceDialog')
        dialog.setAttribute('role', 'dialog')
        dialog.setAttribute('aria-modal', 'true')
        const heading = document.createElement('div')
        heading.className = cls('choiceHeading')
        heading.textContent = labels[kind]
        const select = document.createElement('select')
        select.className = cls('choiceSelect')
        for (const choice of choices) {
          const option = document.createElement('option')
          option.value = choice
          option.textContent = choice
          option.selected = choice === current
          select.append(option)
        }
        const actions = document.createElement('div')
        actions.className = cls('choiceActions')
        const cancel = makeControl('choiceButton', 'choice-cancel')
        cancel.textContent = labels.cancel
        cancel.addEventListener('click', onClose)
        const confirm = makeControl('choiceButton', 'choice-confirm')
        confirm.textContent = labels.confirm
        confirm.disabled = choices.length === 0
        confirm.addEventListener('click', () => { onConfirm(select.value) })
        actions.append(cancel, confirm)
        dialog.append(heading, select, actions)
        overlay.append(dialog)
        overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) onClose() })
        return overlay
      }

      // ------------------------------------------------------------------
      // apply()
      // ------------------------------------------------------------------
      const originalTitle = document.title

      // Chrome marker: geometry rules in skin.css/patches.css (ribbon offset,
      // hero composer placement, worksheet flow) are gated behind this body
      // attribute so a declarative-only activation (hooks refused for
      // locally-dropped skins) keeps the stock layout intact.
      body.dataset.deepcelChrome = ''

      const { chrome: workbook, columns, controls, nameCell } = createWorkbookChrome()
      const worksheet = createWorksheetSurface(nameCell)
      const rows = createRowChrome()
      const {
        footer: status,
        sidebar: sidebarControl,
        workbookTabs,
        addWorkbook,
        language,
        statistics,
      } = createStatusChrome()
      let sidebarOpen = false
      let activeRibbon = 'file'
      let hadActiveSession = false
      let choiceDialog = null
      let formulaInput = null
      let formulaHeight = FORMULA_HEIGHT
      let choiceGeneration = 0
      let workbookSequence = 0
      let selectionSessionRow = selectedNativeSessionRow()
      const workbookStates = []
      let activeWorkbookKey = ''
      let pendingWorkbookKey = ''
      let pendingWorkbookReady = false

      const createBlankWorkbook = () => {
        const state = {
          key: `workbook-${++workbookSequence}`,
          title: labelsFor().newWorkbook,
          blank: true,
        }
        workbookStates.push(state)
        activeWorkbookKey = state.key
        return state
      }
      createBlankWorkbook()

      const openWorkbook = (state) => {
        activeWorkbookKey = state.key
        renderWorkbookTabs()
        if (state.source?.isConnected === true) state.source.click()
        else if (state.blank) clickNativeButton([], ['新建会话', 'New session'])
        else {
          // session row fallback by title, then new session
          const row = [...document.querySelectorAll("#root [class*='sessionRow'][role='treeitem']")]
            .find((candidate) => (candidate.textContent ?? '').includes(state.title))
          if (row !== undefined) row.click()
          else clickNativeButton([], ['新建会话', 'New session'])
        }
      }

      const closeWorkbook = (state) => {
        const index = workbookStates.indexOf(state)
        if (index < 0) return
        const wasActive = state.key === activeWorkbookKey
        if (state.key === pendingWorkbookKey) {
          pendingWorkbookKey = ''
          pendingWorkbookReady = false
        }
        workbookStates.splice(index, 1)
        if (workbookStates.length === 0) createBlankWorkbook()
        if (wasActive) {
          const fallback = workbookStates[Math.min(index, workbookStates.length - 1)]
          activeWorkbookKey = fallback.key
          renderWorkbookTabs()
          if (fallback.source?.isConnected === true) fallback.source.click()
          else if (fallback.blank) clickNativeButton([], ['新建会话', 'New session'])
          return
        }
        renderWorkbookTabs()
      }

      function renderWorkbookTabs() {
        const labels = labelsFor()
        const signature = `${labels.closeWorkbook}|${activeWorkbookKey}|${workbookStates
          .map((state) => `${state.key}:${state.title}`).join('|')}`
        if (workbookTabs.dataset.workbookSignature === signature) return
        const tabs = workbookStates.map((state) => {
          const tab = document.createElement('div')
          tab.className = cls('sheetTabCell')
          tab.dataset.workbookKey = state.key
          tab.toggleAttribute('data-active', state.key === activeWorkbookKey)
          tab.setAttribute('role', 'presentation')
          const label = makeControl('workbookTabLabel', `workbook-${state.key}`)
          label.textContent = state.title
          label.setAttribute('role', 'tab')
          label.setAttribute('aria-selected', String(state.key === activeWorkbookKey))
          label.addEventListener('click', () => { openWorkbook(state) })
          const close = makeControl('workbookClose', `close-${state.key}`)
          close.textContent = '×'
          close.setAttribute('aria-label', `${labels.closeWorkbook}: ${state.title}`)
          close.addEventListener('click', (event) => {
            event.stopPropagation()
            closeWorkbook(state)
          })
          tab.append(label, close)
          return tab
        })
        workbookTabs.replaceChildren(...tabs)
        workbookTabs.dataset.workbookSignature = signature
      }

      const syncWorkbookTabs = () => {
        const labels = labelsFor()
        for (const state of workbookStates) {
          if (state.blank) state.title = labels.newWorkbook
        }
        const phase = document.querySelector('#root [data-phase]')?.dataset.phase
        if (phase === 'settling') {
          renderWorkbookTabs()
          return
        }
        const header = activeSessionHeader()
        if (header === null) {
          let state = workbookStates.find((item) => item.key === activeWorkbookKey && item.blank)
            ?? workbookStates.findLast((item) => item.blank)
          state ??= createBlankWorkbook()
          state.blank = true
          state.title = labels.newWorkbook
          delete state.sessionId
          delete state.source
          activeWorkbookKey = state.key
          if (phase === 'hero' && state.key === pendingWorkbookKey) pendingWorkbookReady = true
          renderWorkbookTabs()
          return
        }
        if (activeWorkbookKey === pendingWorkbookKey && !pendingWorkbookReady) {
          renderWorkbookTabs()
          return
        }
        const title = currentSessionTitle(header) || labels.newWorkbook
        const source = selectedNativeSessionRow()
        let state = source === undefined
          ? undefined
          : workbookStates.find((item) => item.source === source)
        state ??= workbookStates.find((item) =>
          item.key === activeWorkbookKey
            && (item.source === undefined || item.source.isConnected === false))
        if (state === undefined) {
          state = createBlankWorkbook()
        }
        state.blank = false
        state.title = title
        if (source !== undefined) state.source = source
        activeWorkbookKey = state.key
        if (state.key === pendingWorkbookKey) {
          pendingWorkbookKey = ''
          pendingWorkbookReady = false
        }
        renderWorkbookTabs()
      }

      controls.newSession.addEventListener('click', () => {
        const state = createBlankWorkbook()
        pendingWorkbookKey = state.key
        pendingWorkbookReady = document.querySelector('#root [data-phase]')?.dataset.phase === 'hero'
        renderWorkbookTabs()
        clickNativeButton([], ['新建会话', 'New session'])
      })
      addWorkbook.addEventListener('click', () => { controls.newSession.click() })

      const closeChoiceDialog = () => {
        choiceGeneration += 1
        choiceDialog?.remove()
        choiceDialog = null
      }
      const openChoiceDialog = (kind) => {
        const generation = ++choiceGeneration
        choiceDialog?.remove()
        choiceDialog = null
        const loadChoices = kind === 'workspace' || kind === 'preset'
          ? heroChoices(kind)
          : kind === 'permission' ? permissionChoices() : modelChoices(kind)
        void loadChoices.then((choices) => {
          if (generation !== choiceGeneration) return
          const labels = labelsFor()
          const current = kind === 'workspace' || kind === 'preset'
            ? nativeHeroChoiceTrigger(kind)?.textContent?.trim() ?? ''
            : kind === 'permission'
              ? nativePermissionTrigger()?.textContent?.trim() ?? ''
              : modelLabels()[kind]
          choiceDialog = createChoiceDialog(kind, labels, choices, current, (choice) => {
            if (kind === 'workspace' || kind === 'preset') void applyHeroChoice(kind, choice)
            else if (kind === 'permission') void applyPermissionChoice(choice)
            else void applyModelChoice(kind, choice)
            closeChoiceDialog()
          }, closeChoiceDialog)
          body.append(choiceDialog)
        })
      }
      controls.workspace.addEventListener('click', () => { openChoiceDialog('workspace') })
      controls.preset.addEventListener('click', () => { openChoiceDialog('preset') })
      controls.permission.addEventListener('click', () => { openChoiceDialog('permission') })
      controls.model.addEventListener('click', () => { openChoiceDialog('model') })
      controls.thinking.addEventListener('click', () => { openChoiceDialog('thinking') })

      const syncCopy = () => {
        const labels = labelsFor()
        sidebarControl.textContent = sidebarOpen ? '<' : '>'
        sidebarControl.title = sidebarOpen ? labels.sidebarHide : labels.sidebarShow
        sidebarControl.setAttribute('aria-label', sidebarOpen ? labels.sidebarHide : labels.sidebarShow)
        controls.ribbonTabs.get('file').textContent = labels.file
        controls.ribbonTabs.get('home').textContent = labels.conversation
        controls.ribbonTabs.get('manage').textContent = labels.manage
        controls.newSession.textContent = labels.newSession
        controls.newSession.setAttribute('aria-label', labels.newSession)
        controls.newWorkspace.textContent = labels.newWorkspace
        controls.newWorkspace.setAttribute('aria-label', labels.newWorkspace)
        controls.settings.textContent = labels.settings
        controls.settings.setAttribute('aria-label', labels.settings)
        controls.workspace.setAttribute('aria-label', labels.workspace)
        controls.preset.setAttribute('aria-label', labels.preset)
        controls.permission.setAttribute('aria-label', labels.permission)
        controls.model.setAttribute('aria-label', labels.model)
        controls.thinking.setAttribute('aria-label', labels.thinking)
        addWorkbook.textContent = labels.addWorkbook
        addWorkbook.setAttribute('aria-label', labels.addWorkbook)
        syncWorkbookTabs()
      }

      const syncShell = () => {
        const currentSessionRowNow = selectedNativeSessionRow()
        if (currentSessionRowNow !== selectionSessionRow) {
          selectionSessionRow = currentSessionRowNow
          worksheet.clear()
        }
        const shell = findShellParts()
        if (shell === undefined) return
        const { frame, sidebar } = shell
        sidebarOpen = !frame.hasAttribute('data-sidebar-collapsed')
        const offset = sidebarOpen ? sidebarTargetWidth(frame, sidebar) : 0
        body.dataset.deepcelSidebar = sidebarOpen ? 'open' : 'closed'
        body.style.setProperty('--deepcel-sidebar-offset', `${offset}px`)
        sidebarControl.setAttribute('aria-pressed', String(sidebarOpen))
        syncCopy()
      }

      const syncRibbon = () => {
        controls.settings.setAttribute('aria-pressed', String(nativeSettingsTrigger()?.getAttribute('aria-expanded') === 'true'))
        const header = activeSessionHeader()
        const hasActiveSession = header !== null
        if (hasActiveSession && !hadActiveSession) activeRibbon = 'home'
        if (!hasActiveSession && hadActiveSession && activeRibbon === 'home') activeRibbon = 'file'
        hadActiveSession = hasActiveSession

        controls.ribbonTabs.get('home').hidden = !hasActiveSession

        for (const [id, tab] of controls.ribbonTabs) tab.toggleAttribute('data-active', id === activeRibbon)
        const labels = labelsFor()
        const heroChoicesNow = nativeHeroChoiceTriggers()
        const permissionTrigger = nativePermissionTrigger()
        const models = modelLabels()
        controls.workspace.textContent = `${labels.workspace}: ${heroChoicesNow.workspace?.textContent?.trim() || '-'}`
        controls.workspace.disabled = heroChoicesNow.workspace === undefined || heroChoicesNow.workspace.disabled
        controls.preset.textContent = `${labels.preset}: ${heroChoicesNow.preset?.textContent?.trim() || '-'}`
        controls.preset.disabled = heroChoicesNow.preset === undefined || heroChoicesNow.preset.disabled
        controls.permission.textContent = `${labels.permission}: ${permissionTrigger?.textContent?.trim() || '-'}`
        controls.permission.disabled = permissionTrigger === undefined || permissionTrigger.disabled
        controls.model.textContent = `${labels.model}: ${models.model || '-'}`
        controls.model.disabled = nativeModelTrigger()?.disabled ?? true
        controls.thinking.textContent = `${labels.thinking}: ${models.thinking || '-'}`
        controls.thinking.disabled = nativeModelTrigger()?.disabled ?? true
        const desired = []
        if (activeRibbon === 'file') {
          desired.push(
            controls.newWorkspace, controls.newSession, controls.settings,
          )
        } else if (activeRibbon === 'home' && header !== null) {
          const sources = [...header.querySelectorAll("[role='tablist'] [role='tab']")]
          if (sources.length === 0) {
            const chat = makeControl('toolCell', 'view-chat')
            chat.textContent = labels.chat
            chat.setAttribute('role', 'tab')
            chat.setAttribute('aria-selected', 'true')
            desired.push(chat)
          }
          for (const [index, source] of sources.entries()) {
            const label = index === 0 ? labels.chat : source.textContent?.trim() || `View ${index + 1}`
            const proxy = proxyButton(source, label, `view-${index}`)
            proxy.setAttribute('role', 'tab')
            proxy.setAttribute('aria-selected', source.getAttribute('aria-selected') ?? 'false')
            desired.push(proxy)
          }
        } else if (activeRibbon === 'manage') {
          if (heroChoicesNow.workspace !== undefined || heroChoicesNow.preset !== undefined) {
            desired.push(controls.workspace, controls.preset)
          }
          desired.push(controls.permission, controls.model, controls.thinking)
        } else {
          for (const label of TOOL_CELLS) desired.push(makeCell('toolCell', label))
        }
        const toolsSignature = `${activeRibbon}|${desired.map((item) => `${item.textContent}:${item.getAttribute('aria-selected')}`).join('|')}`
        if (controls.tools.dataset.ribbonSignature !== toolsSignature) {
          controls.tools.replaceChildren(...desired)
          controls.tools.dataset.ribbonSignature = toolsSignature
        }
        syncWorkbookTabs()

        for (const source of document.querySelectorAll('[data-deepcel-header-source]')) {
          if (source !== header) delete source.dataset.deepcelHeaderSource
        }
        if (header === null) {
          controls.titleCell.textContent = 'DSH Workbook'
          controls.headerControls.replaceChildren()
          delete controls.titleCell.dataset.titleSignature
          return
        }
        header.dataset.deepcelHeaderSource = ''
        const title = currentSessionTitle(header)
        const titleRow = header.firstElementChild
        const actions = titleRow?.lastElementChild
        const actionItems = headerActionProjections(actions)
        const modeItem = actionItems.find((item) => item.source === undefined)
        const controlItems = actionItems.filter((item) => item !== modeItem)
        const titleSignature = [title, modeItem?.label ?? '', ...controlItems.map((item) => item.label)].join('|')
        if (controls.titleCell.dataset.titleSignature !== titleSignature) {
          const projected = [makeCell('topTitle', title)]
          if (modeItem !== undefined) projected.push(makeCell('topMode', `| ${modeItem.label}`))
          const projectedControls = []
          for (const item of controlItems) {
            const index = actionItems.indexOf(item)
            if (item.source === undefined) projectedControls.push(makeCell('topToken', item.label))
            else {
              const proxy = makeControl('topToken', `header-action-${index}`)
              proxy.textContent = item.label
              proxy.addEventListener('click', () => { item.source?.click() })
              projectedControls.push(proxy)
            }
          }
          controls.titleCell.replaceChildren(...projected)
          controls.headerControls.replaceChildren(...projectedControls)
          controls.titleCell.dataset.titleSignature = titleSignature
        }
      }

      const resizeFormulaInput = () => {
        body.style.setProperty('--deepcel-formula-height', `${FORMULA_HEIGHT}px`)
        body.style.setProperty('--deepcel-ribbon-height', `${RIBBON_HEIGHT}px`)
        const contentHeight = formulaInput === null
          ? FORMULA_HEIGHT
          : Math.max(FORMULA_HEIGHT, formulaInput.scrollHeight)
        const lines = Math.max(1, Math.ceil((contentHeight - 10) / FORMULA_LINE_HEIGHT))
        const nextHeight = Math.min(
          FORMULA_HEIGHT + (FORMULA_MAX_LINES - 1) * FORMULA_LINE_HEIGHT,
          10 + lines * FORMULA_LINE_HEIGHT,
        )
        body.style.setProperty('--deepcel-formula-height', `${nextHeight}px`)
        body.style.setProperty('--deepcel-ribbon-height', `${RIBBON_HEIGHT + nextHeight - FORMULA_HEIGHT}px`)
        formulaInput?.toggleAttribute('data-deepcel-formula-overflow', contentHeight > nextHeight)
        if (formulaHeight === nextHeight) return
        formulaHeight = nextHeight
        fillRowCoordinates(rows)
        worksheet.resize()
      }

      const syncFormulaInput = () => {
        const next = activeComposer()?.querySelector('textarea') ?? null
        const nextOwner = next?.closest('[data-composer-seat]') ?? null
        for (const input of document.querySelectorAll('[data-deepcel-formula-input]')) {
          if (input !== next) delete input.dataset.deepcelFormulaInput
        }
        for (const owner of document.querySelectorAll('[data-deepcel-formula-owner]')) {
          if (owner !== nextOwner) delete owner.dataset.deepcelFormulaOwner
        }
        if (next !== formulaInput) {
          formulaInput?.removeEventListener('input', resizeFormulaInput)
          formulaInput = next
          formulaInput?.addEventListener('input', resizeFormulaInput)
        }
        if (next !== null) next.dataset.deepcelFormulaInput = ''
        if (nextOwner !== null) nextOwner.dataset.deepcelFormulaOwner = ''
        resizeFormulaInput()
      }

      const onRibbonChange = (event) => {
        if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return
        if (!RIBBON_TABS.some((tab) => tab.id === event.detail)) return
        activeRibbon = event.detail
        syncRibbon()
      }
      workbook.addEventListener('deepcel-ribbon-change', onRibbonChange)

      let shellFrame
      const scheduleShellSync = () => {
        if (shellFrame !== undefined) cancelAnimationFrame(shellFrame)
        shellFrame = requestAnimationFrame(() => {
          shellFrame = undefined
          concealNativeEntrypoints()
          syncShell()
          syncRibbon()
          syncFormulaInput()
        })
      }

      const syncCoordinates = () => {
        fillColumnCoordinates(columns)
        fillRowCoordinates(rows)
        worksheet.resize()
        scheduleShellSync()
      }

      const syncLocale = () => {
        language.textContent = localeStatus()
        syncCopy()
        syncRibbon()
      }

      const syncStatistics = () => {
        const sources = [...document.querySelectorAll('[data-deepcel-stats-source]')]
        const text = sources.findLast((source) => source.isConnected)?.textContent?.trim() ?? ''
        if (statistics.textContent !== text) statistics.textContent = text
        statistics.toggleAttribute('hidden', text === '')
      }

      window.addEventListener('resize', syncCoordinates)
      const shellObserver = new MutationObserver((records) => {
        const changed = records.some((record) => {
          if (record.type === 'childList') return true
          if (!(record.target instanceof HTMLElement)) return false
          if (record.attributeName === 'data-sidebar-collapsed') return true
          if (record.attributeName === 'aria-selected'
            || record.attributeName === 'aria-expanded'
            || record.attributeName === 'data-phase') return true
          return record.attributeName === 'style'
            && record.target === findShellParts()?.frame
        })
        if (changed) {
          scheduleShellSync()
          requestAnimationFrame(syncStatistics)
        }
      })
      shellObserver.observe(document.body, { attributes: true, childList: true, subtree: true })

      // locale re-render on lang attribute change
      const langObserver = new MutationObserver(() => {
        syncLocale()
        syncStatistics()
      })
      langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })

      body.append(worksheet.grid, worksheet.selection, workbook, rows, status)
      syncLocale()
      syncStatistics()
      scheduleShellSync()
      document.title = SKIN_TITLE

      // ------------------------------------------------------------------
      // teardown (idempotent)
      // ------------------------------------------------------------------
      ctx.onCleanup(() => {
        window.removeEventListener('resize', syncCoordinates)
        workbook.removeEventListener('deepcel-ribbon-change', onRibbonChange)
        shellObserver.disconnect()
        langObserver.disconnect()
        if (shellFrame !== undefined) cancelAnimationFrame(shellFrame)
        for (const button of document.querySelectorAll('[data-deepcel-native-proxy]')) {
          delete button.dataset.deepcelNativeProxy
        }
        for (const composer of document.querySelectorAll('[data-deepcel-merged-input]')) {
          delete composer.dataset.deepcelMergedInput
        }
        for (const source of document.querySelectorAll('[data-deepcel-stats-source]')) {
          delete source.dataset.deepcelStatsSource
        }
        for (const header of document.querySelectorAll('[data-deepcel-header-source]')) {
          delete header.dataset.deepcelHeaderSource
        }
        for (const input of document.querySelectorAll('[data-deepcel-formula-input]')) {
          delete input.dataset.deepcelFormulaInput
          delete input.dataset.deepcelFormulaOverflow
        }
        for (const owner of document.querySelectorAll('[data-deepcel-formula-owner]')) {
          delete owner.dataset.deepcelFormulaOwner
        }
        for (const source of document.querySelectorAll('[data-deepcel-hero-choice-source]')) {
          delete source.dataset.deepcelHeroChoiceSource
        }
        formulaInput?.removeEventListener('input', resizeFormulaInput)
        closeChoiceDialog()
        delete body.dataset.deepcelChrome
        delete body.dataset.deepcelSidebar
        delete body.dataset.deepcelModelProbing
        body.style.removeProperty('--deepcel-sidebar-offset')
        body.style.removeProperty('--deepcel-formula-height')
        body.style.removeProperty('--deepcel-ribbon-height')
        worksheet.dispose()
        workbook.remove()
        rows.remove()
        status.remove()
        if (document.title === SKIN_TITLE) document.title = originalTitle
      })
    },
  }
}
