import Page from './[...uri]/page';

/**
 * Homepage - Gutenberg Blocks Test Page
 */
export default async function Home() {
  return <Page params={Promise.resolve({ uri: '/' })} />;
}
