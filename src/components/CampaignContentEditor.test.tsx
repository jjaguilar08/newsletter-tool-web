import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CampaignContentEditor, type CampaignContentEditorHandle } from './CampaignContentEditor'
import { ApiError } from '../lib/apiClient'

// grapesjs does real DOM measurement/layout work that jsdom can't support
// (it pegs a test worker's CPU indefinitely) - mocked out entirely so these
// tests exercise only this component's own wiring, not the library internals.
const destroy = vi.fn()
const addBlock = vi.fn()
const addAsset = vi.fn()
const setComponents = vi.fn()
const loadProjectData = vi.fn()
const getHtml = vi.fn(() => '<table><tr><td>Hi</td></tr></table>')
const getCss = vi.fn(() => '.hi { color: red; }')
const getProjectData = vi.fn(() => ({ pages: [], styles: [], assets: [], symbols: [] }))

// Captures the callback the component registers for grapesjs's 'update'
// event (fired on any real project change) so tests can invoke it directly
// to simulate "the user edited the design this session."
let updateCallback: (() => void) | null = null
const on = vi.fn((event: string, callback: () => void) => {
    if (event === 'update') updateCallback = callback
})
function simulateUserEdit() {
    updateCallback?.()
}

type FakeEditor = {
    BlockManager: { add: typeof addBlock }
    AssetManager: { add: typeof addAsset }
    setComponents: typeof setComponents
    loadProjectData: typeof loadProjectData
    destroy: typeof destroy
    getHtml: typeof getHtml
    getCss: typeof getCss
    getProjectData: typeof getProjectData
    on: typeof on
}

interface FakeInitConfig {
    container: HTMLElement
    storageManager: boolean
    plugins: { __mockOpts: { blocks: string[] } }[]
    assetManager: { uploadFile: (ev: unknown) => Promise<void> | undefined }
}

// Config passed to grapesjs.init() is captured here so tests can reach into
// assetManager.uploadFile (a closure defined inside the component) directly,
// the same way a real upload interaction in the Asset Manager modal would
// invoke it.
let lastInitConfig: FakeInitConfig | null = null

const init = vi.fn<(config: FakeInitConfig) => FakeEditor>((config) => {
    lastInitConfig = config
    return {
        BlockManager: { add: addBlock },
        AssetManager: { add: addAsset },
        setComponents,
        loadProjectData,
        destroy,
        getHtml,
        getCss,
        getProjectData,
        on,
    }
})

vi.mock('grapesjs', () => ({
    // Wrapped rather than referencing `init` directly - vi.mock factories
    // run hoisted, before the `const init = ...` above has executed, so the
    // property value must be a closure that reads `init` lazily (at call
    // time) instead of capturing it (i.e. reading its value) immediately.
    default: { init: (config: FakeInitConfig) => init(config) },
    usePlugin: (plugin: unknown, opts: unknown) =>
        Object.assign(() => {}, { __mockPlugin: plugin, __mockOpts: opts }),
}))

vi.mock('grapesjs-preset-newsletter', () => ({ default: vi.fn() }))

vi.mock('juice', () => ({ default: (html: string) => `INLINED(${html})` }))

const uploadCampaignAsset = vi.fn()
vi.mock('../api/campaigns', () => ({
    uploadCampaignAsset: (file: File) => uploadCampaignAsset(file),
}))

beforeEach(() => {
    vi.clearAllMocks()
    updateCallback = null
    lastInitConfig = null
})

describe('CampaignContentEditor', () => {
    it('initializes grapesjs against its container with the curated newsletter blocks', () => {
        render(<CampaignContentEditor initialContent="" initialDesign={null} />)

        expect(init).toHaveBeenCalledTimes(1)
        const config = init.mock.calls[0][0]
        expect(config.container).toBeInstanceOf(HTMLElement)
        expect(config.storageManager).toBe(false)
        expect(config.plugins[0].__mockOpts.blocks).toEqual([
            'text-sect',
            'image',
            'text',
            'button',
            'divider',
        ])
    })

    it('registers the social icons row block, which the preset has no equivalent for', () => {
        render(<CampaignContentEditor initialContent="" initialDesign={null} />)

        expect(addBlock).toHaveBeenCalledWith(
            'social-icons-row',
            expect.objectContaining({ label: 'Social Icons Row' }),
        )
    })

    it('loads existing plain content into the canvas on mount when there is no saved design', () => {
        render(<CampaignContentEditor initialContent="<p>Existing</p>" initialDesign={null} />)

        expect(setComponents).toHaveBeenCalledWith('<p>Existing</p>')
        expect(loadProjectData).not.toHaveBeenCalled()
    })

    it('loads a saved design via loadProjectData instead of the plain content, when both are present', () => {
        const design = { pages: [{ id: 'p1' }], styles: [], assets: [], symbols: [] }
        render(<CampaignContentEditor initialContent="<p>Stale</p>" initialDesign={design} />)

        expect(loadProjectData).toHaveBeenCalledWith(design)
        expect(setComponents).not.toHaveBeenCalled()
    })

    it('does not touch the canvas when there is no initial content or design', () => {
        render(<CampaignContentEditor initialContent="" initialDesign={null} />)

        expect(setComponents).not.toHaveBeenCalled()
        expect(loadProjectData).not.toHaveBeenCalled()
    })

    it("listens for grapesjs's 'update' event to track real edits", () => {
        render(<CampaignContentEditor initialContent="<p>Existing</p>" initialDesign={null} />)

        expect(on).toHaveBeenCalledWith('update', expect.any(Function))
    })

    it('destroys the editor instance on unmount', () => {
        const { unmount } = render(<CampaignContentEditor initialContent="" initialDesign={null} />)

        unmount()

        expect(destroy).toHaveBeenCalledTimes(1)
    })

    it('exposes exportDesign, inlining CSS into HTML the same way the preset export panel does', () => {
        const ref = createRef<CampaignContentEditorHandle>()
        render(<CampaignContentEditor ref={ref} initialContent="" initialDesign={null} />)
        simulateUserEdit()

        const result = ref.current?.exportDesign()

        expect(result?.html).toBe(
            'INLINED(<table><tr><td>Hi</td></tr></table><style>.hi { color: red; }</style>)',
        )
        expect(result?.json).toEqual({ pages: [], styles: [], assets: [], symbols: [] })
    })

    it('exportDesign returns null for a plain-content campaign that has not been touched this session', () => {
        const ref = createRef<CampaignContentEditorHandle>()
        render(<CampaignContentEditor ref={ref} initialContent="Hello" initialDesign={null} />)

        expect(ref.current?.exportDesign()).toBeNull()
    })

    it('exportDesign still returns data for a campaign with an existing design, even with no further edits', () => {
        const ref = createRef<CampaignContentEditorHandle>()
        const design = { pages: [], styles: [], assets: [], symbols: [] }
        render(<CampaignContentEditor ref={ref} initialContent="" initialDesign={design} />)

        expect(ref.current?.exportDesign()).not.toBeNull()
    })

    it('exportDesign returns data once a plain-content campaign has been edited this session', () => {
        const ref = createRef<CampaignContentEditorHandle>()
        render(<CampaignContentEditor ref={ref} initialContent="Hello" initialDesign={null} />)

        simulateUserEdit()

        expect(ref.current?.exportDesign()).not.toBeNull()
    })

    it('uploads a picked file through uploadCampaignAsset and adds the returned URL to the AssetManager', async () => {
        uploadCampaignAsset.mockResolvedValue({
            url: 'http://api.test/storage/campaign-assets/x.png',
        })
        render(<CampaignContentEditor initialContent="" initialDesign={null} />)

        const file = new File(['x'], 'banner.png', { type: 'image/png' })
        await lastInitConfig?.assetManager.uploadFile({
            target: { files: [file] } as unknown,
        } as never)

        expect(uploadCampaignAsset).toHaveBeenCalledWith(file)
        await waitFor(() => {
            expect(addAsset).toHaveBeenCalledWith('http://api.test/storage/campaign-assets/x.png')
        })
    })

    it('shows an error message when the asset upload fails', async () => {
        uploadCampaignAsset.mockRejectedValue(new ApiError(422, 'Invalid image.'))
        render(<CampaignContentEditor initialContent="" initialDesign={null} />)

        const file = new File(['x'], 'banner.png', { type: 'image/png' })
        await lastInitConfig?.assetManager.uploadFile({
            target: { files: [file] } as unknown,
        } as never)

        expect(await screen.findByRole('alert')).toHaveTextContent('Invalid image.')
        expect(addAsset).not.toHaveBeenCalled()
    })
})
