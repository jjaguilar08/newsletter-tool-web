import { useRef, useState, type FormEvent } from 'react'
import { createCampaign, updateCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import {
    CampaignContentEditor,
    type CampaignContentEditorHandle,
    type CampaignDesignExport,
} from './CampaignContentEditor'
import { CampaignHtmlEditor } from './CampaignHtmlEditor'
import {
    alertError,
    buttonPrimary,
    buttonSecondary,
    fieldError,
    formStack,
    input,
    label,
    modalActions,
    modalOverlay,
    modalPanelXWide,
    modalTitle,
    mutedText,
    subheading,
    tabActive,
    tabInactive,
    tabList,
    textarea,
} from '../styles/ui'
import type { Campaign, CampaignInput } from '../types/campaign'

type EditorMode = 'plain' | 'html' | 'visual'

const EDITOR_MODE_OPTIONS: { value: EditorMode; label: string }[] = [
    { value: 'plain', label: 'Plain text' },
    { value: 'html', label: 'HTML editor' },
    { value: 'visual', label: 'Visual builder' },
]

// design_json wins over body_html (matches CampaignContentEditor's own load
// precedence - a design that's been through the Visual builder always has
// both fields set, so this only matters for telling "Visual builder" and
// "HTML editor" campaigns apart when only one of the two is present).
function determineInitialMode(campaign?: Campaign): EditorMode {
    if (!campaign) return 'plain'
    if (campaign.design_json) return 'visual'
    if (campaign.body_html) return 'html'
    return 'plain'
}

interface CampaignFormModalProps {
    campaign?: Campaign
    onClose: () => void
    onSaved: (campaign: Campaign) => void
}

export function CampaignFormModal({ campaign, onClose, onSaved }: CampaignFormModalProps) {
    const isEditing = campaign !== undefined
    const [subject, setSubject] = useState(campaign?.subject ?? '')
    const [content, setContent] = useState(campaign?.content ?? '')
    const [mode, setMode] = useState<EditorMode>(() => determineInitialMode(campaign))
    const [htmlContent, setHtmlContent] = useState(campaign?.body_html ?? '')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // "Export design" below is just a manual preview - Save (handleSubmit)
    // is what actually calls exportDesign() and sends its output. The
    // editor itself stays mounted across mode switches (see the `hidden`
    // class on its wrapper below) rather than being conditionally rendered,
    // so switching to the HTML editor tab and back doesn't wipe an
    // in-progress, not-yet-exported design.
    const designEditorRef = useRef<CampaignContentEditorHandle>(null)
    const [designExport, setDesignExport] = useState<CampaignDesignExport | null>(null)
    const [hasClickedExport, setHasClickedExport] = useState(false)

    function handleExportDesign() {
        setHasClickedExport(true)
        setDesignExport(designEditorRef.current?.exportDesign() ?? null)
    }

    function buildPayload(): CampaignInput {
        if (mode === 'html') {
            // Explicit null (not omitted) so a stale GrapesJS design from
            // before the admin switched to HTML editor mode doesn't stay
            // saved alongside HTML that no longer matches it.
            return { subject, content, body_html: htmlContent, design_json: null }
        }

        if (mode === 'visual') {
            // exportDesign() returns null when there's no design worth
            // sending (an old plain-content campaign that hasn't been
            // touched in the design editor this session) - body_html/
            // design_json are only included when there's an actual design,
            // so a plain Subject/Content edit can't accidentally overwrite
            // a campaign's send content with a near-empty one.
            const design = designEditorRef.current?.exportDesign() ?? null
            return {
                subject,
                content,
                ...(design ? { body_html: design.html, design_json: design.json } : {}),
            }
        }

        return { subject, content }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setIsSubmitting(true)
        setFieldErrors({})
        setFormError(null)

        try {
            const payload = buildPayload()
            // New campaigns are always created as Draft - no status field is
            // ever sent, since the backend drops it on create and rejects it
            // on update (status changes only go through schedule/send).
            const saved = isEditing
                ? await updateCampaign(campaign.id, payload)
                : await createCampaign(payload)
            onSaved(saved)
        } catch (caught) {
            if (caught instanceof ApiError && caught.errors) {
                setFieldErrors(caught.errors)
            } else if (caught instanceof ApiError) {
                setFormError(caught.message)
            } else {
                setFormError('Something went wrong. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className={modalOverlay}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={isEditing ? 'Edit campaign' : 'Add campaign'}
                className={modalPanelXWide}
            >
                <h2 className={modalTitle}>{isEditing ? 'Edit campaign' : 'Add campaign'}</h2>
                <form onSubmit={handleSubmit} noValidate className={`mt-4 ${formStack}`}>
                    <div>
                        <label htmlFor="campaign-subject" className={label}>
                            Subject
                        </label>
                        <input
                            id="campaign-subject"
                            type="text"
                            value={subject}
                            onChange={(event) => setSubject(event.target.value)}
                            required
                            className={input}
                        />
                        {fieldErrors.subject && (
                            <p role="alert" className={fieldError}>
                                {fieldErrors.subject[0]}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="campaign-content" className={label}>
                            Content
                        </label>
                        <textarea
                            id="campaign-content"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            required
                            className={textarea}
                        />
                        {fieldErrors.content && (
                            <p role="alert" className={fieldError}>
                                {fieldErrors.content[0]}
                            </p>
                        )}
                    </div>

                    <div>
                        <h3 className={subheading}>Body</h3>
                        <div
                            role="tablist"
                            aria-label="Body editor mode"
                            className={`mt-2 ${tabList}`}
                        >
                            {EDITOR_MODE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === option.value}
                                    onClick={() => setMode(option.value)}
                                    className={mode === option.value ? tabActive : tabInactive}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        {mode === 'plain' && (
                            <p role="tabpanel" className={`mt-3 ${mutedText}`}>
                                Sends the Content field above as the campaign body.
                            </p>
                        )}

                        {mode === 'html' && (
                            <div role="tabpanel" className="mt-3">
                                <CampaignHtmlEditor value={htmlContent} onChange={setHtmlContent} />
                            </div>
                        )}

                        {/* Stays mounted across mode switches (only visibility is
                            toggled) so flipping to another tab and back doesn't
                            discard an in-progress, unexported design. */}
                        <div role="tabpanel" hidden={mode !== 'visual'} className="mt-3">
                            <p className={mutedText}>
                                Building a design here and clicking Save sends it alongside
                                Subject/Content - Export below is just a preview of what Save will
                                send.
                            </p>
                            <div className="mt-3 overflow-hidden rounded-md border border-slate-300">
                                <CampaignContentEditor
                                    ref={designEditorRef}
                                    initialContent={isEditing ? content : ''}
                                    initialDesign={
                                        isEditing ? (campaign.design_json ?? null) : null
                                    }
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleExportDesign}
                                className={`mt-3 ${buttonSecondary}`}
                            >
                                Export design
                            </button>
                            {designExport ? (
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <p className={label}>Exported HTML</p>
                                        <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                            {designExport.html}
                                        </pre>
                                    </div>
                                    <div>
                                        <p className={label}>Exported JSON</p>
                                        <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                            {JSON.stringify(designExport.json, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                hasClickedExport && (
                                    <p className={`mt-3 ${mutedText}`}>
                                        Nothing to export yet - add or edit a block above first.
                                    </p>
                                )
                            )}
                        </div>
                    </div>

                    {formError && (
                        <p role="alert" className={alertError}>
                            {formError}
                        </p>
                    )}

                    <div className={modalActions}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className={buttonSecondary}
                        >
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className={buttonPrimary}>
                            {isSubmitting ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
