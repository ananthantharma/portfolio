import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect } from "react"
import Head from 'next/head';

export default function Login() {
    const { data: session } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (session) {
            router.push("/dashboard")
        }
    }, [session, router])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
            <Head>
                <title>Login - Password Manager</title>
            </Head>
            <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg">
                <h1 className="mb-6 text-center text-3xl font-bold text-orange-500">Welcome Back</h1>
                <p className="mb-8 text-center text-gray-400">Sign in to access your secure password manager.</p>
                <button
                    onClick={() => signIn("google")}
                    className="flex w-full items-center justify-center rounded-md bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="mr-2 h-6 w-6" />
                    Sign in with Google
                </button>
            </div>
        </div>
    )
}
