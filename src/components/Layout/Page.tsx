import {NextPage} from 'next';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {memo, PropsWithChildren} from 'react';

// Replace this with your own local types or a simple interface
interface PageProps {
  title: string;
  description: string;
}

const Page: NextPage<PropsWithChildren<PageProps>> = memo(({children, title, description}) => {
  const {asPath: pathname} = useRouter();

  const siteUrl = 'www.ananthan.org';

  return (
    <>
      <Head>
        {/* Core SEO */}
        <title>{title}</title>
        <meta content={description} name="description" />
        <link href={`${siteUrl}${pathname}`} key="canonical" rel="canonical" />

        {/* Generic Icons (Ensure these exist in your /public folder) */}
        <link href="/favicon.ico" rel="icon" sizes="any" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" />

        {/* Social Media Previews (Open Graph) */}
        <meta content={title} property="og:title" />
        <meta content={description} property="og:description" />
        <meta content={`${siteUrl}${pathname}`} property="og:url" />

        {/* Social Media Previews (Twitter) */}
        <meta content="summary_large_image" name="twitter:card" />
        <meta content={title} name="twitter:title" />
        <meta content={description} name="twitter:description" />
      </Head>
      {children}
    </>
  );
});

Page.displayName = 'Page';
export default Page;
