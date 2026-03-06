/**
 * @liteforge/calendar - Toolbar Component
 */

import { signal, effect } from '@liteforge/core'
import type { CalendarView, CalendarClasses, CalendarTranslations, Resource, ToolbarConfig, CalendarSizeClass } from '../types.js'
import {
  formatFullDate,
  formatWeekRange,
  formatMonthYear,
} from '../date-utils.js'
import { getClass } from '../views/shared.js'

interface ToolbarOptions {
  currentDate: () => Date
  currentView: () => CalendarView
  locale: string
  weekStart: number
  classes: Partial<CalendarClasses>
  translations: CalendarTranslations
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  resources?: Resource[]
  visibleResources?: () => string[]
  onToggleResource?: (id: string) => void
  weekendsVisible?: () => boolean
  onToggleWeekends?: () => void
  toolbarConfig?: ToolbarConfig | undefined
  sizeClass?: () => CalendarSizeClass
}

export function renderToolbar(options: ToolbarOptions): HTMLDivElement {
  const {
    currentDate,
    currentView,
    locale,
    weekStart,
    classes,
    translations: t,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    resources = [],
    visibleResources,
    onToggleResource,
    weekendsVisible,
    onToggleWeekends,
    toolbarConfig,
    sizeClass,
  } = options

  const toolbar = document.createElement('div')
  toolbar.className = getClass('toolbar', classes, 'lf-cal-toolbar')

  if (sizeClass) {
    effect(() => { toolbar.dataset.size = sizeClass() })
  }

  // Navigation
  const nav = document.createElement('div')
  nav.className = getClass('toolbarNav', classes, 'lf-cal-toolbar-nav')

  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.textContent = t.prev
  prevBtn.addEventListener('click', onPrev)

  const todayBtn = document.createElement('button')
  todayBtn.type = 'button'
  todayBtn.textContent = t.today
  todayBtn.addEventListener('click', onToday)

  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.textContent = t.next
  nextBtn.addEventListener('click', onNext)

  nav.appendChild(prevBtn)
  nav.appendChild(todayBtn)
  nav.appendChild(nextBtn)

  toolbar.appendChild(nav)

  // Title
  const title = document.createElement('div')
  title.className = getClass('toolbarTitle', classes, 'lf-cal-toolbar-title')

  // Update title reactively
  effect(() => {
    const date = currentDate()
    const view = currentView()

    switch (view) {
      case 'day':
      case 'resource-day':
        title.textContent = formatFullDate(date, locale)
        break
      case 'week':
        title.textContent = formatWeekRange(date, locale, weekStart)
        break
      case 'month':
        title.textContent = formatMonthYear(date, locale)
        break
      case 'agenda':
        title.textContent = formatMonthYear(date, locale)
        break
    }
  })

  toolbar.appendChild(title)

  // View switcher
  const views = document.createElement('div')
  views.className = getClass('toolbarViews', classes, 'lf-cal-toolbar-views')

  const viewButtons: Array<{ view: CalendarView; label: string }> = [
    { view: 'day', label: t.day },
    { view: 'resource-day', label: t.resourceDay },
    { view: 'week', label: t.week },
    { view: 'month', label: t.month },
    { view: 'agenda', label: t.agenda },
  ]

  const buttonEls: HTMLButtonElement[] = []

  for (const { view, label } of viewButtons) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = label
    btn.dataset.view = view
    btn.addEventListener('click', () => onViewChange(view))
    views.appendChild(btn)
    buttonEls.push(btn)
  }

  // Update active state reactively
  effect(() => {
    const view = currentView()
    for (const btn of buttonEls) {
      btn.classList.toggle('active', btn.dataset.view === view)
    }
  })

  toolbar.appendChild(views)

  // Weekend toggle (only if handler provided)
  if (onToggleWeekends && weekendsVisible) {
    const weekendBtn = document.createElement('button')
    weekendBtn.type = 'button'
    weekendBtn.className = 'lf-cal-toolbar-weekend-toggle'
    weekendBtn.title = 'Toggle weekends'
    weekendBtn.addEventListener('click', onToggleWeekends)

    effect(() => {
      const visible = weekendsVisible()
      weekendBtn.textContent = visible ? t.hideWeekends : t.showWeekends
      weekendBtn.classList.toggle('lf-cal-toolbar-weekend-toggle--active', !visible)
    })

    toolbar.appendChild(weekendBtn)
  }

  // Resource toggles (only if resources provided)
  if (resources.length > 0 && onToggleResource && visibleResources) {
    if (toolbarConfig?.resourceDisplay === 'dropdown') {
      // ── Dropdown mode ──────────────────────────────────────────────────────
      const dropdownLabel = toolbarConfig?.resourceDropdownLabel ?? t.resourceDay

      const wrapper = document.createElement('div')
      wrapper.className = 'lf-cal-toolbar-res-dropdown'

      const toggleBtn = document.createElement('button')
      toggleBtn.type = 'button'
      toggleBtn.className = 'lf-cal-toolbar-res-dropdown-toggle'

      const labelSpan = document.createElement('span')
      labelSpan.textContent = dropdownLabel
      const chevron = document.createElement('span')
      chevron.className = 'lf-cal-toolbar-res-dropdown-chevron'
      chevron.textContent = '▾'
      toggleBtn.appendChild(labelSpan)
      toggleBtn.appendChild(chevron)

      const menu = document.createElement('div')
      menu.className = 'lf-cal-toolbar-res-dropdown-menu'

      const openState = signal(false)

      effect(() => {
        menu.style.display = openState() ? 'block' : 'none'
        chevron.style.transform = openState() ? 'rotate(180deg)' : ''
      })

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        openState.update(v => !v)
      })

      // Close on outside click
      const closeOnOutside = (e: MouseEvent) => {
        if (!wrapper.contains(e.target as Node)) {
          openState.set(false)
        }
      }
      document.addEventListener('click', closeOnOutside)
      // Note: cleanup would require onCleanup — acceptable leak for long-lived toolbar

      // Build menu items
      const resourceBtns = new Map<string, { row: HTMLElement; check: HTMLElement }>()

      for (const resource of resources) {
        const row = document.createElement('button')
        row.type = 'button'
        row.className = 'lf-cal-toolbar-res-dropdown-item'
        row.addEventListener('click', (e) => {
          e.stopPropagation()
          onToggleResource(resource.id)
        })

        const check = document.createElement('span')
        check.className = 'lf-cal-toolbar-res-dropdown-check'

        const dot = document.createElement('span')
        dot.className = 'lf-cal-toolbar-resource-dot'
        if (resource.color) dot.style.background = resource.color

        const name = document.createElement('span')
        name.textContent = resource.name

        row.appendChild(check)
        row.appendChild(dot)
        row.appendChild(name)
        menu.appendChild(row)
        resourceBtns.set(resource.id, { row, check })
      }

      // Reactively update check marks + hidden state
      effect(() => {
        const visible = visibleResources()
        for (const [id, { row, check }] of resourceBtns) {
          const isVisible = visible.includes(id)
          check.textContent = isVisible ? '✓' : ''
          row.classList.toggle('lf-cal-toolbar-res-dropdown-item--hidden', !isVisible)
        }
      })

      wrapper.appendChild(toggleBtn)
      wrapper.appendChild(menu)
      toolbar.appendChild(wrapper)
    } else {
      // ── Inline mode (default) ──────────────────────────────────────────────
      const resourcesEl = document.createElement('div')
      resourcesEl.className = 'lf-cal-toolbar-resources'

      const resourceBtns = new Map<string, HTMLButtonElement>()

      for (const resource of resources) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'lf-cal-toolbar-resource'
        btn.title = resource.name
        btn.addEventListener('click', () => onToggleResource(resource.id))

        const dot = document.createElement('span')
        dot.className = 'lf-cal-toolbar-resource-dot'
        if (resource.color) dot.style.background = resource.color

        const label = document.createElement('span')
        label.textContent = resource.name

        btn.appendChild(dot)
        btn.appendChild(label)
        resourcesEl.appendChild(btn)
        resourceBtns.set(resource.id, btn)
      }

      effect(() => {
        const visible = visibleResources()
        for (const [id, btn] of resourceBtns) {
          btn.classList.toggle('lf-cal-toolbar-resource--hidden', !visible.includes(id))
        }
      })

      toolbar.appendChild(resourcesEl)
    }
  }

  // ── Mobile view-selector dropdown ─────────────────────────────────────────

  const viewButtons2: Array<{ view: CalendarView; label: string }> = [
    { view: 'day', label: t.day },
    { view: 'resource-day', label: t.resourceDay },
    { view: 'week', label: t.week },
    { view: 'month', label: t.month },
    { view: 'agenda', label: t.agenda },
  ]

  const mobileViewSel = document.createElement('div')
  mobileViewSel.className = 'lf-cal-toolbar-mobile-view-sel'

  const mobileBtn = document.createElement('button')
  mobileBtn.type = 'button'
  mobileBtn.className = 'lf-cal-toolbar-mobile-view-btn'

  const mobileBtnLabel = document.createElement('span')
  const mobileBtnChevron = document.createElement('span')
  mobileBtnChevron.textContent = '▾'
  mobileBtn.appendChild(mobileBtnLabel)
  mobileBtn.appendChild(mobileBtnChevron)

  // Update label reactively
  effect(() => {
    const view = currentView()
    const found = viewButtons2.find(vb => vb.view === view)
    mobileBtnLabel.textContent = found ? found.label : view
  })

  const mobileMenu = document.createElement('div')
  mobileMenu.className = 'lf-cal-toolbar-mobile-view-menu'
  mobileMenu.style.display = 'none'

  const mobileMenuOpen = signal(false)

  effect(() => {
    mobileMenu.style.display = mobileMenuOpen() ? 'block' : 'none'
  })

  mobileBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    mobileMenuOpen.update(v => !v)
  })

  const closeMenuOnOutside = (e: MouseEvent) => {
    if (!mobileViewSel.contains(e.target as Node)) {
      mobileMenuOpen.set(false)
    }
  }
  document.addEventListener('click', closeMenuOnOutside)

  for (const { view, label } of viewButtons2) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'lf-cal-toolbar-mobile-view-item'
    item.textContent = label
    item.addEventListener('click', () => {
      onViewChange(view)
      mobileMenuOpen.set(false)
    })
    mobileMenu.appendChild(item)
  }

  mobileViewSel.appendChild(mobileBtn)
  mobileViewSel.appendChild(mobileMenu)
  toolbar.appendChild(mobileViewSel)

  return toolbar
}
