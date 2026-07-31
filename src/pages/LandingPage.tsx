import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faClock, faLayerGroup, faUsers } from '@fortawesome/free-solid-svg-icons'
import { sendSampleNewsletter } from '../api/marketing'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/apiClient'
import {
    beaconButtonPrimary,
    beaconButtonPrimarySm,
    beaconCard,
    beaconCardBody,
    beaconCardIcon,
    beaconCardTitle,
    beaconEyebrow,
    beaconFooter,
    beaconFormError,
    beaconFormInput,
    beaconFormSuccess,
    beaconHeader,
    beaconHeadline,
    beaconLogo,
    beaconPage,
    beaconScreenshotCaption,
    beaconScreenshotFrame,
    beaconSection,
    beaconSectionSage,
    beaconSubhead,
} from '../styles/ui'

const FEATURES = [
    {
        icon: faUsers,
        title: 'Subscriber management, done right',
        body: 'Import your list from a CSV in seconds, track subscribed, unsubscribed, and bounced status automatically, and search or filter whenever you need to find someone.',
    },
    {
        icon: faLayerGroup,
        title: 'Write it your way',
        body: 'Draft in plain text, hand-code HTML with a live sandboxed preview, or drag and drop blocks together in a visual builder - switch between all three any time before you send.',
    },
    {
        icon: faClock,
        title: 'Schedule it and move on',
        body: 'Send immediately or schedule for later - Beacon dispatches automatically at the right time and logs every delivery, so you always know what happened.',
    },
    {
        icon: faChartLine,
        title: "See what's working",
        body: 'A dashboard of subscriber and campaign stats at a glance, so you always know where things stand.',
    },
]

const SCREENSHOTS = [
    {
        src: '/marketing/dashboard.png',
        alt: 'Beacon dashboard showing subscriber and campaign stats',
    },
    { src: '/marketing/campaigns.png', alt: 'Beacon campaign list with status badges and actions' },
    {
        src: '/marketing/campaign-editor.png',
        alt: 'Beacon campaign editor in HTML editor mode with a live preview',
    },
] as const

const SCREENSHOT_CAPTIONS = ['Dashboard', 'Campaigns', 'Campaign editor']

function describeSampleNewsletterError(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 429) {
            return "You've requested a few samples already - try again in about an hour."
        }
        if (error.errors?.email) {
            return error.errors.email[0]
        }
        return error.message
    }
    return 'Something went wrong. Please try again.'
}

function SampleNewsletterForm() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState<string | null>(null)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setStatus('submitting')
        setMessage(null)

        try {
            const response = await sendSampleNewsletter(email)
            setStatus('success')
            setMessage(response.message)
        } catch (error) {
            setStatus('error')
            setMessage(describeSampleNewsletterError(error))
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
        >
            <label htmlFor="sample-newsletter-email" className="sr-only">
                Email address
            </label>
            <input
                id="sample-newsletter-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={beaconFormInput}
            />
            <button
                type="submit"
                disabled={status === 'submitting'}
                className={`${beaconButtonPrimarySm} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
            >
                {status === 'submitting' ? 'Sending…' : 'Send me a sample'}
            </button>
            {status === 'success' && <p className={`${beaconFormSuccess} basis-full`}>{message}</p>}
            {status === 'error' && (
                <p role="alert" className={`${beaconFormError} basis-full`}>
                    {message}
                </p>
            )}
        </form>
    )
}

export function LandingPage() {
    const { user, isLoading } = useAuth()

    return (
        <div className={beaconPage}>
            <header className={beaconHeader}>
                <span className={beaconLogo}>Beacon</span>
                {isLoading ? (
                    <span className={`${beaconButtonPrimarySm} invisible`}>Log in</span>
                ) : user ? (
                    <Link to="/dashboard" className={beaconButtonPrimarySm}>
                        Go to Dashboard
                    </Link>
                ) : (
                    <Link to="/login" className={beaconButtonPrimarySm}>
                        Log in
                    </Link>
                )}
            </header>

            <main>
                {/* Hero */}
                <section className={beaconSection}>
                    <p className={beaconEyebrow}>Built for the people who send it</p>
                    <h1 className={beaconHeadline}>
                        Newsletters that ship themselves out the door.
                    </h1>
                    <p className={beaconSubhead}>
                        Manage your subscriber list, write your campaign in plain text, hand-coded
                        HTML with a live preview, or a drag-and-drop visual builder, then schedule
                        it and let Beacon handle the send.
                    </p>
                    <div className="mt-8">
                        {isLoading ? null : user ? (
                            <Link to="/dashboard" className={beaconButtonPrimary}>
                                Go to Dashboard
                            </Link>
                        ) : (
                            <Link to="/login" className={beaconButtonPrimary}>
                                Log in
                            </Link>
                        )}
                    </div>
                </section>

                {/* Feature highlights */}
                <section className={beaconSection}>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {FEATURES.map((feature) => (
                            <div key={feature.title} className={beaconCard}>
                                <div className={beaconCardIcon}>
                                    <FontAwesomeIcon icon={feature.icon} />
                                </div>
                                <h3 className={beaconCardTitle}>{feature.title}</h3>
                                <p className={beaconCardBody}>{feature.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* See it for yourself */}
                <section className={beaconSectionSage}>
                    <div className={beaconSection}>
                        <p className={beaconEyebrow}>See it for yourself</p>
                        <h2 className={beaconHeadline}>The actual app, not a mockup.</h2>
                        <p className={beaconSubhead}>
                            Every screenshot below is Beacon running for real - no staged demo data,
                            no design-tool comps.
                        </p>
                        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
                            {SCREENSHOTS.map((screenshot, index) => (
                                <div key={screenshot.src}>
                                    <div className={beaconScreenshotFrame}>
                                        <img
                                            src={screenshot.src}
                                            alt={screenshot.alt}
                                            className="w-full"
                                        />
                                    </div>
                                    <p className={beaconScreenshotCaption}>
                                        {SCREENSHOT_CAPTIONS[index]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sample newsletter */}
                <section className={beaconSection}>
                    <p className={beaconEyebrow}>Try it before you sign in</p>
                    <h2 className={beaconHeadline}>Send yourself a sample newsletter.</h2>
                    <p className={beaconSubhead}>
                        Enter your email and we'll send Beacon's default newsletter template to your
                        inbox, so you can see exactly what your subscribers will see.
                    </p>
                    <SampleNewsletterForm />
                </section>
            </main>

            <footer className={beaconFooter}>
                <p>Beacon - built for staff-run newsletters.</p>
                {isLoading ? null : user ? (
                    <p className="mt-2">
                        <Link to="/dashboard" className="underline hover:no-underline">
                            Go to Dashboard
                        </Link>
                    </p>
                ) : (
                    <p className="mt-2">
                        <Link to="/login" className="underline hover:no-underline">
                            Staff log in
                        </Link>
                    </p>
                )}
            </footer>
        </div>
    )
}
