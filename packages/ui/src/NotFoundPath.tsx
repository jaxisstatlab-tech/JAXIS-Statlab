"use client";

import { useEffect, useState } from "react";

// Shows the path the visitor actually requested; renders a neutral placeholder on the server.
export function NotFoundPath() {
  const [path, setPath] = useState("/");
  useEffect(() => setPath(window.location.pathname), []);
  return <span className="text-white/70">path = &apos;{path}&apos;</span>;
}
