import { useRef, useState, type FormEvent } from 'react'
import { createCampaign, updateCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import {
    CampaignContentEditor,
    type CampaignContentEditorHandle,
    type CampaignDesignExport,
} from './CampaignContentEditor'
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
    textarea,
} from '../styles/ui'
import type { Campaign } from '../types/campaign'

interface CampaignFormModalProps {
    campaign?: Campaign
    onClose: () => void
    onSaved: (campaign: Campaign) => void
}

export function CampaignFormModal({ campaign, onClose, onSaved }: CampaignFormModalProps) {
    const isEditing = campaign !== undefined
    const [subject, setSubject] = useState(campaign?.subject ?? '')
    const [content, setContent] = useState(campaign?.content ?? '')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // "Export design" below is just a manual preview - Save (handleSubmit)
    // is what actually calls exportDesign() and sends its output.
    const designEditorRef = useRef<CampaignContentEditorHandle>(null)
    const [designExport, setDesignExport] = useState<CampaignDesignExport | null>(null)
    const [hasClickedExport, setHasClickedExport] = useState(false)

    function handleExportDesign() {
        setHasClickedExport(true)
        setDesignExport(designEditorRef.current?.exportDesign() ?? null)
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setIsSubmitting(true)
        setFieldErrors({})
        setFormError(null)

        try {
            // exportDesign() returns null when there's no design worth
            // sending (an old plain-content campaign that hasn't been
            // touched in the design editor this session) - body_html/
            // design_json are only included when there's an actual design,
            // so a plain Subject/Content edit can't accidentally overwrite
            // a campaign's send content with a near-empty one.
            const design = designEditorRef.current?.exportDesign() ?? null
            const payload = {
                subject,
                content,
                ...(design ? { body_html: design.html, design_json: design.json } : {}),
            }
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
                        <h3 className={subheading}>Design editor</h3>
                        <p className={`mt-1 ${mutedText}`}>
                            Building a design here and clicking Save sends it alongside Subject/
                            Content - Export below is just a preview of what Save will send.
                        </p>
                        <div className="mt-3 overflow-hidden rounded-md border border-slate-300">
                            <CampaignContentEditor
                                ref={designEditorRef}
                                initialContent={isEditing ? content : ''}
                                initialDesign={isEditing ? (campaign.design_json ?? null) : null}
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
