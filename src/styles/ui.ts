// Shared Tailwind class-name conventions for the app's light theme - a
// single source of truth so every page/modal renders buttons, fields,
// tables, and cards the same way instead of each hand-rolling its own
// classes. Plain string constants, not components, so this file can be
// imported anywhere (including files that also export a component) without
// tripping eslint-plugin-react-refresh's only-export-components rule.
//
// Palette: indigo-600 for primary actions/links/focus rings, slate for
// neutral surfaces/text/borders, red for destructive actions and errors.

const buttonBase =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const buttonBaseSm =
    'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export const buttonPrimary = `${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500`
export const buttonSecondary = `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-500`
export const buttonDestructive = `${buttonBase} bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500`

// Compact variants for dense table-row action groups (Edit/Delete/View/
// Preview/Schedule/Send Now can all appear in one row) - same colors, less
// padding, so a row of five actions doesn't overwhelm the row height.
export const buttonPrimarySm = `${buttonBaseSm} bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500`
export const buttonSecondarySm = `${buttonBaseSm} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-500`
export const buttonDestructiveSm = `${buttonBaseSm} bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500`

export const label = 'mb-1 block text-sm font-medium text-slate-700'

const controlBase =
    'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-50 disabled:text-slate-500'

export const input = controlBase
export const select = controlBase
export const textarea = `${controlBase} min-h-32 resize-y`

export const fieldError = 'mt-1 text-sm text-red-600'

export const alertError =
    'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'

export const card = 'rounded-lg border border-slate-200 bg-white shadow-sm'

export const pageContainer = 'mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8'

export const pageHeading = 'text-2xl font-semibold tracking-tight text-slate-900'

export const modalTitle = 'text-lg font-semibold text-slate-900'

export const subheading = 'text-sm font-semibold uppercase tracking-wide text-slate-500'

export const sidebar =
    'flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-6'

export const sidebarBrand = 'px-2 text-lg font-semibold tracking-tight text-slate-900'

export const sidebarNav = 'mt-8 flex flex-col gap-1'

const sidebarNavLinkBase =
    'rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

export const sidebarNavLink = `${sidebarNavLinkBase} text-slate-600 hover:bg-slate-100 hover:text-slate-900`
export const sidebarNavLinkActive = `${sidebarNavLinkBase} bg-indigo-50 text-indigo-700`

export const sidebarFooter = 'border-t border-slate-200 pt-4'

export const tableWrapper = 'overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm'
export const table = 'min-w-full divide-y divide-slate-200'
export const tableHeadRow = 'bg-slate-50'
export const th =
    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500'
export const tableBody = 'divide-y divide-slate-100 bg-white'
export const tableRow = 'hover:bg-slate-50'
export const td = 'px-4 py-3 text-sm whitespace-nowrap text-slate-700'
export const tdActions = 'px-4 py-3 text-sm'
export const rowActions = 'flex flex-wrap gap-2'

export const mutedText = 'text-sm text-slate-500'

export const emptyState =
    'rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500'

export const loadingState =
    'flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500'

export const paginationBar =
    'flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600'

export const modalOverlay =
    'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4'
export const modalPanel =
    'flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl'
export const modalPanelWide =
    'flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl'
export const modalPanelXWide =
    'flex max-h-[90vh] w-full max-w-5xl flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl'

export const formStack = 'space-y-4'
export const modalActions = 'mt-6 flex justify-end gap-3'

export const tabList = 'flex gap-1 border-b border-slate-200'
const tabBase =
    'rounded-t-md border border-b-0 border-transparent px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
export const tabActive = `${tabBase} border-slate-300 bg-white text-indigo-700`
export const tabInactive = `${tabBase} text-slate-500 hover:text-slate-700`

export const monospaceTextarea = `${textarea} min-h-64 font-mono text-xs`
