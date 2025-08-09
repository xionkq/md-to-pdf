import type { FontResource } from '../index';

export async function fetchArrayBuffer(url: string, init?: RequestInit): Promise<ArrayBuffer> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Failed to fetch font: ${res.status} ${res.statusText}`);
  return res.arrayBuffer();
}

export interface FontUrlSet {
  normal: string;
  bold?: string;
  italics?: string;
  bolditalics?: string;
}

export async function buildFontResourceFromUrls(name: string, urls: FontUrlSet, init?: RequestInit): Promise<FontResource> {
  const [normal, bold, italics, bolditalics] = await Promise.all([
    fetchArrayBuffer(urls.normal, init),
    urls.bold ? fetchArrayBuffer(urls.bold, init) : Promise.resolve(undefined),
    urls.italics ? fetchArrayBuffer(urls.italics, init) : Promise.resolve(undefined),
    urls.bolditalics ? fetchArrayBuffer(urls.bolditalics, init) : Promise.resolve(undefined),
  ]);

  return {
    name,
    normal,
    ...(bold ? { bold } : {}),
    ...(italics ? { italics } : {}),
    ...(bolditalics ? { bolditalics } : {}),
  } as FontResource;
}


