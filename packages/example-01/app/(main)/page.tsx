import { Content } from 'nextpress';

import { fetchContentByUri } from '@/lib/utils';
import { fetchStylesAndScriptsByUri } from '@/lib/utils';
import Styles from "@/components/Styles";
import Scripts from "@/components/Scripts";

export default async function Home() {
  const content = await fetchContentByUri('/sample-page');
  const { stylesheets, scripts } = await fetchStylesAndScriptsByUri('/sample-page');

  return (
    <>
      <Styles stylesheets={stylesheets} />
      <Scripts scripts={scripts}>
        <div id="main-content" className="min-h-screen px-4 pt-4">
          <Content content={content} />
        </div>
      </Scripts>
    </>
  );
}
