import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
// Aliased on import - grapesjs's usePlugin is a plain plugin-options helper,
// not a React hook, but eslint-plugin-react-hooks treats any `use*`-named
// call as one based on the identifier alone.
import grapesjs, {
    usePlugin as withPluginOptions,
    type Editor,
    type ProjectData,
    type UploadFileFn,
} from 'grapesjs'
import newsletterPreset from 'grapesjs-preset-newsletter'
import juice from 'juice'
import 'grapesjs/dist/css/grapes.min.css'
import { uploadCampaignAsset } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import { alertError } from '../styles/ui'

// Curated subset of grapesjs-preset-newsletter's built-in blocks (see its
// dist/index.js block registrations) - only what the campaign editor needs.
// 'text-sect' (heading + paragraph) stands in for a header/banner block since
// the preset has no dedicated banner block.
const NEWSLETTER_PRESET_BLOCKS = ['text-sect', 'image', 'text', 'button', 'divider']

// The preset has no built-in "row of social links" block, so this one is
// hand-registered below the same way the preset registers its own blocks:
// plain table markup with inline styles, no external icon assets required.
const SOCIAL_ICONS_ROW_BLOCK_ID = 'social-icons-row'
const SOCIAL_ICONS_ROW_CONTENT = `
  <table style="width: 100%; margin: 10px 0;">
    <tr>
      <td align="center">
        <table style="margin: 0 auto;">
          <tr>
            <td style="padding: 0 8px;"><a href="#" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background-color:#373d49;color:#ffffff;text-align:center;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;">f</a></td>
            <td style="padding: 0 8px;"><a href="#" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background-color:#373d49;color:#ffffff;text-align:center;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;">X</a></td>
            <td style="padding: 0 8px;"><a href="#" style="display:inline-block;width:32px;height:32px;line-height:32px;border-radius:50%;background-color:#373d49;color:#ffffff;text-align:center;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;">in</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`

export interface CampaignDesignExport {
    // Table-based, inline-CSS HTML produced by editor.getHtml() + juice -
    // the email-safe form (see grapesjs-preset-newsletter's own "Export"
    // panel, which inlines the same way internally).
    html: string
    json: ProjectData
}

export interface CampaignContentEditorHandle {
    // Null when there's nothing worth persisting yet - see the comment above
    // exportDesign's implementation for exactly when that is.
    exportDesign: () => CampaignDesignExport | null
}

interface CampaignContentEditorProps {
    // Both only read on mount - this component isn't meant to react to later
    // prop changes, same as an uncontrolled input. Key the component by
    // campaign id in the parent to force a remount when editing a different
    // campaign.
    initialContent: string
    // A previously-saved design (Campaign.design_json), or null if this
    // campaign has never been through the design editor.
    initialDesign: ProjectData | null
}

export const CampaignContentEditor = forwardRef<
    CampaignContentEditorHandle,
    CampaignContentEditorProps
>(function CampaignContentEditor({ initialContent, initialDesign }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const editorRef = useRef<Editor | null>(null)
    const hasUnsavedChangesRef = useRef(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Full control over the upload request (rather than the built-in
        // `assetManager.upload` URL option) since the backend responds with
        // a bare { url }, not the { data: [...] } shape `autoAdd` expects.
        // Uses the same apiClient (cookie session + CSRF header) every other
        // mutating request in this app goes through. Reads editorRef.current
        // rather than closing over the `editor` local below - this runs only
        // once a user actually uploads a file, well after the effect (and
        // the `editorRef.current = editor` assignment near its end) has
        // finished, so the ref is always populated by call time.
        const handleUploadFile: UploadFileFn = (event) => {
            const files = event.dataTransfer
                ? event.dataTransfer.files
                : (event.target as HTMLInputElement | null)?.files
            const file = files?.[0]
            if (!file) return undefined

            setUploadError(null)
            return uploadCampaignAsset(file)
                .then(({ url }) => {
                    editorRef.current?.AssetManager.add(url)
                })
                .catch((error: unknown) => {
                    setUploadError(
                        error instanceof ApiError ? error.message : 'Failed to upload image.',
                    )
                })
        }

        const editor = grapesjs.init({
            container: containerRef.current,
            height: '500px',
            storageManager: false,
            // Click-to-append alongside the default drag - appends to the
            // selected component, or the wrapper if nothing's selected.
            blockManager: { appendOnClick: true },
            assetManager: { uploadFile: handleUploadFile },
            plugins: [withPluginOptions(newsletterPreset, { blocks: NEWSLETTER_PRESET_BLOCKS })],
        })

        editor.BlockManager.add(SOCIAL_ICONS_ROW_BLOCK_ID, {
            label: 'Social Icons Row',
            content: SOCIAL_ICONS_ROW_CONTENT,
        })

        if (initialDesign) {
            editor.loadProjectData(initialDesign)
        } else if (initialContent) {
            editor.setComponents(initialContent)
        }

        // Listened for only after the initial load above, so it fires for
        // real user edits (component added/removed, style changes, etc. -
        // grapesjs's own description of this event) without the load itself
        // being mistaken for one - exportDesign (below) uses this flag to
        // tell "the user actually built/edited a design this session" apart
        // from "the editor just loaded whatever was already there."
        editor.on('update', () => {
            hasUnsavedChangesRef.current = true
        })

        editorRef.current = editor

        return () => {
            editor.destroy()
            editorRef.current = null
        }
        // Mount-once: initialContent/initialDesign are starting values, not
        // props this effect should react to (see the note on
        // CampaignContentEditorProps).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useImperativeHandle(ref, () => ({
        exportDesign: () => {
            const editor = editorRef.current
            if (!editor) return null

            // A campaign that has never been through the design editor (no
            // saved design_json) and hasn't been touched this session either
            // has nothing worth sending as a design - without this check,
            // simply opening Edit and clicking Save on an old plain-content
            // campaign would silently attach a near-empty body_html (the
            // canvas's default empty-wrapper markup), which CampaignMail
            // would then send instead of the actual plain content. Once a
            // design exists (loaded or newly built), later saves keep
            // exporting it even with no further edits - re-sending the same
            // design is harmless and expected.
            if (!initialDesign && !hasUnsavedChangesRef.current) return null

            // Same approach grapesjs-preset-newsletter's own "Export" modal
            // uses internally: inline the stylesheet into the markup with
            // juice so the result is safe for email clients that strip <style>.
            const inlinableHtml = `${editor.getHtml()}<style>${editor.getCss() ?? ''}</style>`

            return {
                html: juice(inlinableHtml),
                json: editor.getProjectData(),
            }
        },
    }))

    // This editor's panels (Style Manager color/number fields, trait inputs,
    // etc.) render as plain <input> elements inside CampaignFormModal's own
    // <form> - without this, pressing Enter in any of them (e.g. typing a
    // border-radius value) triggers the browser's implicit form submission
    // and saves/closes the modal mid-edit. Doesn't affect Enter inside the
    // canvas itself (text editing there happens inside an iframe, which
    // never bubbles key events into this document's tree at all).
    function preventEnterFromSubmittingForm(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
            event.preventDefault()
        }
    }

    return (
        <div onKeyDown={preventEnterFromSubmittingForm}>
            {uploadError && (
                <p role="alert" className={`mb-2 ${alertError}`}>
                    {uploadError}
                </p>
            )}
            <div ref={containerRef} />
        </div>
    )
})
