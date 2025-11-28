import React, {
  Fragment,
  PropsWithChildren,
} from 'react';
import Script from 'next/script';
import { escapeRegExp } from 'lodash';

import {
  ScriptLoadingStrategyEnum,
  ScriptLoadingGroupEnum,
  EnqueuedScript,
} from "@/types";

interface RenderScriptProps { script: EnqueuedScript; }

function RenderScript(props: RenderScriptProps) {
  const { script } = props;

  const {
    src: rawSrc,
    handle,
    strategy: loadingStrategy,
    location,
    before,
    after,
    extraData,
  } = script;

  let beforeScript: string|undefined;
  if (before) {
    beforeScript = Array.isArray(before) ? before.join(' ') : before;
  }

  let afterScript: string|undefined;
  if (after) {
    afterScript = Array.isArray(after) ? after.join(' ') : after;
  }

  switch (handle) {
    case 'wp-api-fetch':
      afterScript = afterScript?.replace(
        new RegExp(`(((https?:)?\/\/|\/\/)${escapeRegExp(process.env.wcr_wp_domain)}\/wp\-json)`),
        `${process.env.wcr_frontend_url}/api/wp-json`,
      );
      afterScript = afterScript?.replace(
        new RegExp(`(((https?:)?\/\/|\/\/)${escapeRegExp(process.env.wcr_wp_domain)}\/wp\-admin\/admin\-ajax\.php)`),
        `${process.env.wcr_frontend_url}/api/wp`,
      );
      break;
  }

  const async = loadingStrategy === ScriptLoadingStrategyEnum.ASYNC || undefined;
  const defer = loadingStrategy === ScriptLoadingStrategyEnum.DEFER || undefined;
  const strategy = location === ScriptLoadingGroupEnum.HEADER ? 'beforeInteractive' : 'afterInteractive';

  let src = '';
  const isInternalRoute = new RegExp('^\/(?!\/)(.*)$');
  if (rawSrc && isInternalRoute.test(rawSrc)) {
    src = `${process.env.wcr_frontend_url}/api/wp-internal-assets${rawSrc}`;
  } else {
    src = rawSrc?.replace(
      new RegExp(`^((?:http(s)?:\/\/|\/\/)${escapeRegExp(process.env.wcr_wp_domain)})?\/(.*)$`),
      `${process.env.wcr_frontend_url}/api/wp-assets/$3`,
    ) || '';
  }

  const ExtraDataScript = extraData && (
    <Script
      id={`${handle}-extra`}
      dangerouslySetInnerHTML={{ __html: extraData }}
      strategy={strategy}
    />
  );

  const BeforeScript = beforeScript && (
    <Script
      id={`${handle}-before`}
      dangerouslySetInnerHTML={{ __html: beforeScript }}
      strategy={strategy}
    />
  );

  const MainScript = rawSrc && (
    <Script
      id={handle as string}
      src={src as string}
      strategy={strategy}
      async={async}
      defer={defer}
    />
  );

  const AfterScript = afterScript && (
    <Script
      id={`${handle}-after`}
      dangerouslySetInnerHTML={{ __html: afterScript }}
      strategy={strategy}
    />
  );

  return (
    <Fragment key={handle}>
      {ExtraDataScript}
      {BeforeScript}
      {MainScript}
      {AfterScript}
    </Fragment>
  );
}

type RenderScriptsProps = { scripts: EnqueuedScript[], type?: 'header' | 'footer' };

export async function RenderScripts({ scripts, type, children }: PropsWithChildren<RenderScriptsProps>) {
  const headerScripts = scripts
    .filter((script) => script.location === ScriptLoadingGroupEnum.HEADER)
  const footerScripts = scripts
    .filter((script) => script.location === ScriptLoadingGroupEnum.FOOTER)

  if (type === 'header') {
    return <>{headerScripts.map((script) => <RenderScript key={script.handle} script={script} />)}</>;
  }

  if (type === 'footer') {
    return <>{footerScripts.map((script) => <RenderScript key={script.handle} script={script} />)}</>;
  }

  return (
    <Fragment>
      {headerScripts.map((script) => <RenderScript key={script.handle} script={script} />)}
      {children}
      {footerScripts.map((script) => <RenderScript key={script.handle} script={script} />)}
    </Fragment>
  );
}