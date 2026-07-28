import { useState, type ChangeEvent, type FormEvent } from 'react'
import { importSubscribers } from '../api/subscribers'
import { ApiError } from '../lib/apiClient'
import type { ImportSubscribersResult } from '../types/subscriber'

interface SubscriberImportModalProps {
    onClose: () => void
    onImported: () => void
}

export function SubscriberImportModal({ onClose, onImported }: SubscriberImportModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState<ImportSubscribersResult | null>(null)

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        setFile(event.target.files?.[0] ?? null)
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!file) return

        setIsSubmitting(true)
        setFieldErrors({})
        setFormError(null)

        try {
            const imported = await importSubscribers(file)
            setResult(imported)
            // Fired as soon as the import succeeds, not on modal close - the
            // list underneath should already reflect new/updated rows while
            // the user is still reviewing skipped rows here.
            onImported()
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
        <div role="dialog" aria-modal="true" aria-label="Import subscribers">
            <h2>Import subscribers</h2>

            {result ? (
                <div>
                    <p>
                        Created {result.created}, updated {result.updated}, skipped{' '}
                        {result.skipped}.
                    </p>
                    {result.skipped_rows.length > 0 && (
                        <table>
                            <caption>Skipped rows</caption>
                            <thead>
                                <tr>
                                    <th>Row</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.skipped_rows.map((skippedRow) => (
                                    <tr key={skippedRow.row}>
                                        <td>{skippedRow.row}</td>
                                        <td>{skippedRow.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <button type="button" onClick={onClose}>
                        Close
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} noValidate>
                    <div>
                        <label htmlFor="subscriber-import-file">CSV file</label>
                        <input
                            id="subscriber-import-file"
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleFileChange}
                        />
                        {fieldErrors.file && <p role="alert">{fieldErrors.file[0]}</p>}
                    </div>

                    {formError && <p role="alert">{formError}</p>}

                    <button type="button" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || !file}>
                        {isSubmitting ? 'Importing…' : 'Import'}
                    </button>
                </form>
            )}
        </div>
    )
}
