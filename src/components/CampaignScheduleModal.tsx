import { useState, type FormEvent } from 'react'
import { scheduleCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import { ConfirmDialog } from './ConfirmDialog'
import type { Campaign } from '../types/campaign'

interface CampaignScheduleModalProps {
    campaign: Campaign
    onClose: () => void
    onScheduled: (campaign: Campaign) => void
}

export function CampaignScheduleModal({
    campaign,
    onClose,
    onScheduled,
}: CampaignScheduleModalProps) {
    const [scheduledAt, setScheduledAt] = useState('')
    const [stage, setStage] = useState<'form' | 'confirm'>('form')
    const [clientError, setClientError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Mirrors the backend's `after:now` rule so an obviously-wrong date
    // doesn't need a round trip - the 422 response is still the source of
    // truth for anything this misses (e.g. clock skew right at the edge).
    function handleContinue(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setClientError(null)
        setFieldErrors({})

        if (!scheduledAt) {
            setClientError('Choose a date and time.')
            return
        }
        if (new Date(scheduledAt).getTime() <= Date.now()) {
            setClientError('Scheduled time must be in the future.')
            return
        }

        setStage('confirm')
    }

    async function handleConfirmSchedule() {
        setIsSubmitting(true)
        setFormError(null)

        try {
            const saved = await scheduleCampaign(campaign.id, new Date(scheduledAt).toISOString())
            onScheduled(saved)
        } catch (error) {
            if (error instanceof ApiError && error.errors) {
                setFieldErrors(error.errors)
                setStage('form')
            } else if (error instanceof ApiError) {
                setFormError(error.message)
            } else {
                setFormError('Failed to schedule campaign.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    if (stage === 'confirm') {
        return (
            <ConfirmDialog
                title="Schedule campaign"
                message={`Schedule "${campaign.subject}" to send at ${new Date(scheduledAt).toLocaleString()}?`}
                confirmLabel="Schedule"
                isConfirming={isSubmitting}
                error={formError}
                onConfirm={() => void handleConfirmSchedule()}
                onCancel={() => setStage('form')}
            />
        )
    }

    return (
        <div role="dialog" aria-modal="true" aria-label="Schedule campaign">
            <h2>Schedule campaign</h2>
            <form onSubmit={handleContinue} noValidate>
                <div>
                    <label htmlFor="campaign-scheduled-at">Send at</label>
                    <input
                        id="campaign-scheduled-at"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)}
                        required
                    />
                    {clientError && <p role="alert">{clientError}</p>}
                    {fieldErrors.scheduled_at && <p role="alert">{fieldErrors.scheduled_at[0]}</p>}
                </div>

                <button type="button" onClick={onClose}>
                    Cancel
                </button>
                <button type="submit">Continue</button>
            </form>
        </div>
    )
}
