/**
 * Provider-agnostic S3 object storage.
 *
 * Replaces the Replit object-storage sidecar (which only exists inside Replit)
 * with a plain S3 client so the app can persist files on Railway or any other
 * host. Works with AWS S3 and any S3-compatible service (Cloudflare R2,
 * Supabase Storage, MinIO, etc.) by setting `S3_ENDPOINT`.
 *
 * Required env vars:
 *   S3_BUCKET             bucket name
 *   S3_REGION             region (e.g. ap-northeast-2); defaults to us-east-1
 *   S3_ACCESS_KEY_ID      access key
 *   S3_SECRET_ACCESS_KEY  secret key
 * Optional:
 *   S3_ENDPOINT           custom endpoint for non-AWS S3-compatible providers
 *   S3_FORCE_PATH_STYLE   "true" for providers that need path-style URLs (R2/MinIO)
 *   S3_KEY_PREFIX         prefix prepended to every object key (e.g. "prod")
 */
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

let cachedClient: S3Client | null = null;

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error(
      "S3_BUCKET not set. Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and " +
        "S3_SECRET_ACCESS_KEY to enable durable file storage.",
    );
  }
  return bucket;
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 credentials not set. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
    );
  }

  cachedClient = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    ...(process.env.S3_FORCE_PATH_STYLE === "true"
      ? { forcePathStyle: true }
      : {}),
    // Recent aws-sdk v3 adds CRC32 checksum headers by default, which
    // S3-compatible providers like Backblaze B2 reject. Only send checksums
    // when the operation actually requires them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cachedClient;
}

/** Prepends the optional global key prefix to a logical object key. */
function fullKey(key: string): string {
  const prefix = (process.env.S3_KEY_PREFIX || "").replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${key}` : key;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/** Uploads a buffer under `key`. Overwrites any existing object. */
export async function putObject(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: fullKey(key),
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

/** Fetches the object at `key`, or null if it does not exist. */
export async function getObject(
  key: string,
): Promise<{ buffer: Buffer; contentType: string; lastModified?: Date } | null> {
  try {
    const out = await getClient().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: fullKey(key) }),
    );
    if (!out.Body) return null;
    const buffer = await streamToBuffer(out.Body as Readable);
    return {
      buffer,
      contentType: out.ContentType || "application/octet-stream",
      lastModified: out.LastModified,
    };
  } catch (err) {
    const name = (err as { name?: string })?.name;
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    if (name === "NoSuchKey" || name === "NotFound" || status === 404) {
      return null;
    }
    throw err;
  }
}

/** Best-effort delete of the object at `key`. */
export async function deleteObject(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: getBucket(), Key: fullKey(key) }),
    );
  } catch (err) {
    const name = (err as { name?: string })?.name;
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    if (name === "NoSuchKey" || name === "NotFound" || status === 404) {
      return;
    }
    throw err;
  }
}

/** Lists only the requested logical namespace, respecting the configured prefix. */
export async function listObjects(prefix: string, continuationToken?: string) {
  const result = await getClient().send(new ListObjectsV2Command({
    Bucket: getBucket(), Prefix: fullKey(prefix), ContinuationToken: continuationToken, MaxKeys: 1000,
  }));
  const physicalPrefix = fullKey(prefix);
  return {
    objects: (result.Contents ?? []).filter(object => object.Key?.startsWith(physicalPrefix)).map(object => ({
      key: prefix + object.Key!.slice(physicalPrefix.length), lastModified: object.LastModified,
    })),
    continuationToken: result.IsTruncated ? result.NextContinuationToken : undefined,
  };
}
