"use client";

import Image from "next/image";
import { useState } from "react";

export function BrandLogo({ compact = false }: Readonly<{ compact?: boolean }>) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="font-semibold tracking-tight text-[#0f4c4c]">DailyLoaf</span>;
  }

  return compact ? (
    <Image src="/brand/dailyloaf-icon.png" alt="DailyLoaf" width={38} height={38} onError={() => setFailed(true)} priority />
  ) : (
    <Image src="/brand/dailyloaf-logo.png" alt="DailyLoaf" width={220} height={73} style={{ width: "220px", height: "auto" }} onError={() => setFailed(true)} priority />
  );
}
