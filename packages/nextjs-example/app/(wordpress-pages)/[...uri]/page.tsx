import { Content } from '@axistaylor/nextpress';
import { fetchContentByUri } from '@/lib/utils';
import Link from 'next/link';

export interface PageParams {
  params: {
    uri?: string|string[];
  }
}

export default async function Page({ params: paramsPromise }: PageParams) {
  const params = await paramsPromise;
  let uri: string = '/';
  if (Array.isArray(params.uri)) {
    uri = params.uri.join('/');
  } else if (typeof params.uri === 'string') {
    uri = params.uri
  }
  
  const content = await fetchContentByUri(uri);
  if (!content) {
    console.error(`Failed to find page content for: ${uri}`)
    return null;
  }
  return <Content content={content} linksAs={Link} />;
}