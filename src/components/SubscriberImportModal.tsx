import { useState, type ChangeEvent, type FormEvent } from 'react'
import { importSubscribers } from '../api/subscribers'
import { ApiError } from '../lib/apiClient'
import {
    alertError,
    buttonPrimary,
    buttonSecondary,
    fieldError,
    formStack,
    label,
    modalActions,
    modalOverlay,
    modalPanel,
    modalTitle,
    table,
    tableBody,
    tableHeadRow,
    tableRow,
    tableWrapper,
    td,
    th,
} from '../styles/ui'
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
        <div className={modalOverlay}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Import subscribers"
                className={modalPanel}
            >
                <h2 className={modalTitle}>Import subscribers</h2>

                {result ? (
                    <div className="mt-4">
                        <p className="text-sm text-beacon-ink">
                            Created {result.created}, updated {result.updated}, skipped{' '}
                            {result.skipped}.
                        </p>
                        {result.skipped_rows.length > 0 && (
                            <div className={`${tableWrapper} mt-4`}>
                                <table className={table}>
                                    <caption className="sr-only">Skipped rows</caption>
                                    <thead className={tableHeadRow}>
                                        <tr>
                                            <th className={th}>Row</th>
                                            <th className={th}>Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tableBody}>
                                        {result.skipped_rows.map((skippedRow) => (
                                            <tr key={skippedRow.row} className={tableRow}>
                                                <td className={td}>{skippedRow.row}</td>
                                                <td className={td}>{skippedRow.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className={modalActions}>
                            <button type="button" onClick={onClose} className={buttonPrimary}>
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate className={`mt-4 ${formStack}`}>
                        <div>
                            <label htmlFor="subscriber-import-file" className={label}>
                                CSV file
                            </label>
                            <input
                                id="subscriber-import-file"
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-beacon-ink file:mr-4 file:rounded-md file:border-0 file:bg-beacon-terracotta/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-beacon-terracotta hover:file:bg-beacon-terracotta/20"
                            />
                            {fieldErrors.file && (
                                <p role="alert" className={fieldError}>
                                    {fieldErrors.file[0]}
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
                            <button
                                type="submit"
                                disabled={isSubmitting || !file}
                                className={buttonPrimary}
                            >
                                {isSubmitting ? 'Importing…' : 'Import'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
