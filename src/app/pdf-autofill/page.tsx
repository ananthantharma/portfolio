import dynamic from 'next/dynamic';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import AccessDenied from '@/components/AccessDenied';

// Load the heavy PDF client component without SSR to avoid pdfjs/window issues
const PdfAutoFillClient = dynamic(() => import('./PdfAutoFillClient'), {ssr: false});

export default async function PdfAutoFillPage() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any).formFillEnabled) {
    return (
      <AccessDenied message="Access Denied. You do not have permission to access Form Fill. Please contact Ananthan." />
    );
  }

  return <PdfAutoFillClient />;
}
