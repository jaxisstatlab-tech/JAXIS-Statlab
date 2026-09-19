"use client";

import React, { useEffect, useState } from "react";
import ParticleGlobe from "./ParticleGlobe";

export function AuthGlobeClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <ParticleGlobe layout="auth-crescent" interactive={false} />;
}

