import { Content } from 'nextpress';
import { fetchContentByUri } from '@/lib/utils';

export interface PageParams {
  params: {
    uri?: string|string[];
  }
}

export default async function Page({ params }: PageParams) {
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
  return (
    <div id="main-content" className="min-h-screen px-4 pt-4">
      <Content content={content} />
    </div>
  );
}