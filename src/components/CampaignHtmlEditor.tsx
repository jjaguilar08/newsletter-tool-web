import { useEffect, useRef, useState } from 'react'
import { getDefaultCampaignTemplate } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import { ConfirmDialog } from './ConfirmDialog'
import { alertError, buttonSecondary, label, monospaceTextarea, mutedText } from '../styles/ui'

// How long to wait after the last keystroke before refreshing the preview
// iframe - keeps typing smooth instead of re-rendering the whole sandboxed
// document on every character.
const PREVIEW_DEBOUNCE_MS = 300

interface CampaignHtmlEditorProps {
    value: string
    onChange: (html: string) => void
}

function describeTemplateError(error: unknown): string {
    return error instanceof ApiError ? error.message : 'Failed to load the default template.'
}

export function CampaignHtmlEditor({ value, onChange }: CampaignHtmlEditorProps) {
    const [previewHtml, setPreviewHtml] = useState(value)
    const [prefillError, setPrefillError] = useState<string | null>(null)
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [resetError, setResetError] = useState<string | null>(null)
    // Guards the prefill effect below against React StrictMode's
    // dev-only double-invoke, so a fresh HTML editor doesn't fire the
    // default-template request twice.
    const hasPrefilledRef = useRef(false)

    // Prefill from the default template on first use for a campaign that
    // has no HTML yet - an admin opening this mode for the first time
    // should see a real starting point, not a blank textarea.
    useEffect(() => {
        if (value || hasPrefilledRef.current) return
        hasPrefilledRef.current = true

        getDefaultCampaignTemplate()
            .then((template) => onChange(template.html))
            .catch((error: unknown) => setPrefillError(describeTemplateError(error)))
        // Runs once on mount to prefill an empty editor - onChange/value
        // aren't dependencies this effect should react to afterward.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const timeout = setTimeout(() => setPreviewHtml(value), PREVIEW_DEBOUNCE_MS)
        return () => clearTimeout(timeout)
    }, [value])

    async function handleReset() {
        setIsResetting(true)
        setResetError(null)
        try {
            const template = await getDefaultCampaignTemplate()
            onChange(template.html)
            setIsResetConfirmOpen(false)
        } catch (error) {
            setResetError(describeTemplateError(error))
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <div>
            {/* Side by side on wide screens (lg+) so the code and its
                rendered result are both visible at a usable size at once;
                stacks on narrower screens, same as before. */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <label htmlFor="campaign-html" className={label}>
                            HTML
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsResetConfirmOpen(true)}
                            className={buttonSecondary}
                        >
                            Reset to default template
                        </button>
                    </div>
                    {prefillError && (
                        <p role="alert" className={`mb-2 ${alertError}`}>
                            {prefillError}
                        </p>
                    )}
                    <textarea
                        id="campaign-html"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        spellCheck={false}
                        className={`h-[32rem] ${monospaceTextarea}`}
                    />
                </div>

                <div>
                    <div className="mb-3">
                        <p className={label}>Preview</p>
                        <p className={mutedText}>Updates a moment after you stop typing.</p>
                    </div>
                    {/* Same empty-sandbox pattern as CampaignPreviewModal - admin-authored
                        HTML is still arbitrary HTML, so no allow-scripts/allow-same-origin. */}
                    <iframe
                        title="HTML editor preview"
                        srcDoc={previewHtml}
                        sandbox=""
                        className="h-[32rem] w-full rounded-md border border-slate-200"
                    />
                </div>
            </div>

            {isResetConfirmOpen && (
                <ConfirmDialog
                    title="Reset to default template"
                    message="This replaces the current HTML with the default template. Your edits will be lost."
                    confirmLabel="Reset"
                    isConfirming={isResetting}
                    error={resetError}
                    onConfirm={() => void handleReset()}
                    onCancel={() => setIsResetConfirmOpen(false)}
                />
            )}
        </div>
    )
}
