import { useState, type FormEvent } from 'react'
import { createSubscriber, updateSubscriber } from '../api/subscribers'
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
    select,
} from '../styles/ui'
import type { Subscriber, SubscriberStatus } from '../types/subscriber'

const STATUS_OPTIONS: SubscriberStatus[] = ['subscribed', 'unsubscribed', 'bounced']

interface SubscriberFormModalProps {
    subscriber?: Subscriber
    onClose: () => void
    onSaved: (subscriber: Subscriber) => void
}

export function SubscriberFormModal({ subscriber, onClose, onSaved }: SubscriberFormModalProps) {
    const isEditing = subscriber !== undefined
    const [email, setEmail] = useState(subscriber?.email ?? '')
    const [name, setName] = useState(subscriber?.name ?? '')
    const [status, setStatus] = useState<SubscriberStatus>(subscriber?.status ?? 'subscribed')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setIsSubmitting(true)
        setFieldErrors({})
        setFormError(null)

        try {
            const payload = { email, name: name === '' ? null : name, status }
            const saved = isEditing
                ? await updateSubscriber(subscriber.id, payload)
                : await createSubscriber(payload)
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
                aria-label={isEditing ? 'Edit subscriber' : 'Add subscriber'}
                className={modalPanel}
            >
                <h2 className={modalTitle}>{isEditing ? 'Edit subscriber' : 'Add subscriber'}</h2>
                <form onSubmit={handleSubmit} noValidate className={`mt-4 ${formStack}`}>
                    <div>
                        <label htmlFor="subscriber-email" className={label}>
                            Email
                        </label>
                        <input
                            id="subscriber-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            className={input}
                        />
                        {fieldErrors.email && (
                            <p role="alert" className={fieldError}>
                                {fieldErrors.email[0]}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="subscriber-name" className={label}>
                            Name
                        </label>
                        <input
                            id="subscriber-name"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className={input}
                        />
                        {fieldErrors.name && (
                            <p role="alert" className={fieldError}>
                                {fieldErrors.name[0]}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="subscriber-status" className={label}>
                            Status
                        </label>
                        <select
                            id="subscriber-status"
                            value={status}
                            onChange={(event) => setStatus(event.target.value as SubscriberStatus)}
                            className={select}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.status && (
                            <p role="alert" className={fieldError}>
                                {fieldErrors.status[0]}
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
