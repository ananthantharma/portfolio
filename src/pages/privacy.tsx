
import React from 'react';
import Page from '../components/Layout/Page';
import Header from '../components/Sections/Header';

const PrivacyPolicy = () => {
    return (
        <Page title="Privacy Policy" description="Privacy Policy for Ananthan's Portfolio and App">
            <Header />
            <div className="min-h-screen bg-neutral-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto bg-neutral-800 rounded-2xl p-8 shadow-xl text-neutral-200">
                    <h1 className="text-3xl font-bold text-orange-500 mb-8 border-b border-neutral-700 pb-4">
                        Privacy Policy
                    </h1>

                    <div className="prose prose-invert max-w-none space-y-6">
                        <p className="text-lg">
                            Effective Date: {new Date().toLocaleDateString()}
                        </p>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
                            <p>
                                Welcome to my personal portfolio and application ("we," "our," or "us").
                                We are committed to protecting your privacy and ensuring you have a positive experience on our website.
                                This Privacy Policy explains how we collect, use, and share information about you when you visit or use our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
                            <p>
                                We collect information you provide directly to us when you use our application:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>
                                    <strong>Account Information:</strong> When you sign in with Google, we collect your name, email address, and profile picture to create and manage your account.
                                </li>
                                <li>
                                    <strong>User Content:</strong> We store the content you create or upload, such as notes, financial data, tasks, and documents.
                                </li>
                                <li>
                                    <strong>Usage Data:</strong> We may collect anonymous analytics data about how you interact with our website to improve performance and user experience (e.g., page views).
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
                            <p>
                                We use the information we collect to:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Provide, maintain, and improve our services.</li>
                                <li>Authenticate your identity and secure your account.</li>
                                <li>Personalize your experience and deliver features like Notes, Finance tracking, and AI Chat.</li>
                                <li>Communicate with you regarding updates or support.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing and Disclosure</h2>
                            <p>
                                We do not sell your personal data. We may share information with:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>
                                    <strong>Service Providers:</strong> We use trusted third-party services (such as Google Cloud, MongoDB, Vercel, and OpenAI) to host our data and provide AI functionalities. These providers have access to your information only to perform specific tasks on our behalf.
                                </li>
                                <li>
                                    <strong>Legal Compliance:</strong> We may disclose information if required by law or to protect our rights and safety.
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
                            <p>
                                We implement industry-standard security measures to protect your data. Your restricted information (like financial records or secure notes) is handled with extra care and access controls. However, no method of transmission over the internet is 100% secure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
                            <p>
                                You have the right to access, correct, or delete your personal information. If you wish to delete your account and all associated data, please contact me directly using the contact form on the home page or via email.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">7. Contact Us</h2>
                            <p>
                                If you have any questions about this Privacy Policy, please contact me at:
                                <br />
                                <a href="mailto:lankanprinze@gmail.com" className="text-orange-400 hover:text-orange-300 transition-colors">
                                    lankanprinze@gmail.com
                                </a>
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default PrivacyPolicy;
