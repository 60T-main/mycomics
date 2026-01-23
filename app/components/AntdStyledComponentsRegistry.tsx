// Source - https://stackoverflow.com/a
// Posted by Hashira
// Retrieved 2026-01-21, License - CC BY-SA 4.0

"use client";

import React from "react";
import { useServerInsertedHTML } from "next/navigation";
import { StyleProvider, createCache, extractStyle } from "@ant-design/cssinjs";

export default function AntdStyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = React.useState(() => createCache()); // gets antd cached styles

  // innsert cache style on the server
  useServerInsertedHTML(() => (
    <style
      id="antd"
      dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
    ></style>
  ));

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
