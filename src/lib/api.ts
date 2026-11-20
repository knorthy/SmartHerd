import type { GrowthStage, Measurements } from './estimate';
import { getSettings } from './herd';
import { photoBase64 } from './photos';

export type EstimateInput = {
  id: string;
  stage: GrowthStage;
  sideUri: string;
  topUri: string;
  sideDistCm: number;
  topDistCm: number;
  /** 35 mm-equivalent focal length from the photo's EXIF, when the picker gave one. */
  sideF35Mm?: number;
  topF35Mm?: number;
};

export type EstimateOutcome =
  | { kind: 'ok'; est: Measurements & { weight: number }; stageRangeOk: boolean }
  | { kind: 'retake'; reason: string }
  | { kind: 'offline'; message: string } // retry later: network error, timeout, 401, 5xx
  | { kind: 'rejected'; message: string }; // will never succeed: 400, 413, unreadable photo file

export type CloudRecord = {
  uid: string;
  deleted?: boolean;
  goat_id?: string;
  stage?: GrowthStage;
  ts?: string;
  side_dist_cm?: number;
  top_dist_cm?: number;
  measurements?: { body_length_cm?: number; chest_height_cm?: number; chest_width_cm?: number; heart_girth_cm?: number };
  weight_kg?: number;
  validated?: boolean;
  retake?: boolean;
  stage_range_ok?: boolean;
  source?: string;
  goat?: { name: string; tag: string; member: string };
};

const UNREACHABLE = 'Can’t reach the SmartHerd server.';

/** '' means simulated mode. */
export const apiBase = () => getSettings().serverUrl;

async function call(base: string, token: string, path: string, body?: unknown, ms = 10_000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(`${base.replace(/\/+$/, '')}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function outcomeFromResponse(status: number, body: any): EstimateOutcome {
  body = body ?? {};
  if (status === 200 && body.retake) return { kind: 'retake', reason: String(body.reason ?? 'retake needed') };
  if (status === 200) {
    return {
      kind: 'ok',
      est: { bodyLength: body.body_length_cm, chestHeight: body.chest_height_cm, chestWidth: body.chest_width_cm, heartGirth: body.heart_girth_cm, weight: body.weight_kg },
      stageRangeOk: body.stage_range_ok !== false,
    };
  }
  if (status === 401) return { kind: 'offline', message: 'The server did not accept the access code. Check it in Profile.' };
  if (status === 400 || status === 413) return { kind: 'rejected', message: String(body.error ?? 'The server could not use these photos.') };
  return { kind: 'offline', message: 'The SmartHerd server had a problem. Try again.' };
}

export async function requestEstimate(c: EstimateInput): Promise<EstimateOutcome> {
  let side: string, top: string;
  try {
    [side, top] = await Promise.all([photoBase64(c.sideUri), photoBase64(c.topUri)]);
  } catch {
    return { kind: 'rejected', message: 'A photo could not be read. Take it again.' };
  }
  const { serverUrl, token } = getSettings();
  try {
    const res = await call(
      serverUrl,
      token,
      '/estimate',
      // undefined focal lengths drop out of the JSON, so the server falls back to the photo's own EXIF
      { uid: c.id, stage: c.stage, side_dist_cm: c.sideDistCm, top_dist_cm: c.topDistCm, side_image: side, top_image: top, side_f35_mm: c.sideF35Mm, top_f35_mm: c.topF35Mm },
      90_000,
    );
    return outcomeFromResponse(res.status, await res.json().catch(() => ({})));
  } catch {
    return { kind: 'offline', message: UNREACHABLE };
  }
}

export async function pushRecord(rec: CloudRecord): Promise<boolean> {
  const { serverUrl, token } = getSettings();
  try {
    return (await call(serverUrl, token, '/records', rec)).ok;
  } catch {
    return false;
  }
}

/** null = unreachable or unauthorized. */
export async function pullRecords(): Promise<CloudRecord[] | null> {
  const { serverUrl, token } = getSettings();
  try {
    const res = await call(serverUrl, token, '/records');
    const body = res.ok ? await res.json() : null;
    return Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

/** Tests the given address and code, not the saved ones. */
export async function ping(serverUrl: string, token: string): Promise<'ok' | 'unauthorized' | 'unreachable'> {
  try {
    const body = await (await call(serverUrl, token, '/health')).json();
    return body?.authorized === true ? 'ok' : body?.authorized === false ? 'unauthorized' : 'unreachable';
  } catch {
    return 'unreachable';
  }
}

if (__DEV__) {
  // self-check: the status/body → outcome mapping the result screen and sync rely on
  const k = (s: number, b: any) => outcomeFromResponse(s, b);
  console.assert(k(200, { retake: true, reason: 'x' }).kind === 'retake', 'api retake');
  const ok = k(200, { retake: false, weight_kg: 27.1, body_length_cm: 60, chest_height_cm: 30, chest_width_cm: 18, heart_girth_cm: 70, stage_range_ok: true });
  console.assert(ok.kind === 'ok' && ok.est.weight === 27.1 && ok.est.bodyLength === 60, 'api ok');
  console.assert(k(401, {}).kind === 'offline', 'api 401');
  const bad = k(400, { error: 'e' });
  console.assert(bad.kind === 'rejected' && bad.message === 'e', 'api 400');
  console.assert(k(500, {}).kind === 'offline', 'api 500');
}
