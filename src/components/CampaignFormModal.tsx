import { useState, type FormEvent } from 'react'
import { createCampaign, updateCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
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
    modalPanel,
    modalTitle,
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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setIsSubmitting(true)
        setFieldErrors({})
        setFormError(null)

        try {
            const payload = { subject, content }
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
                className={modalPanel}
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
