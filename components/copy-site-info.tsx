'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopySiteInfo({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyInfo() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="copy-site-card" type="button" onClick={copyInfo}>
      <span className="copy-site-label">本站信息（点击复制）</span>
      <code>{value}</code>
      <span className="copy-site-action">{copied ? <><Check size={15} /> 已复制</> : <><Copy size={15} /> 复制</>}</span>
    </button>
  );
}
