import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readEnv, requireEnv } from "@/lib/env";
import { badRequest } from "@/lib/errors";

export const STORAGE_BUCKET = readEnv("STORAGE_BUCKET") ?? "inventory-assets";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ImageContentType = (typeof ALLOWED_IMAGE_TYPES)[number];
export type UploadScope = "avatar" | "logo" | "product";

export const STORAGE_PREFIXES: Record<UploadScope, string> = {
  avatar: "avatars",
  logo: "settings",
  product: "products",
};

const EXTENSIONS: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

let client: S3Client | undefined;

export function isStorageConfigured(): boolean {
  return Boolean(
    readEnv("AWS_ACCESS_KEY_ID") &&
      readEnv("AWS_SECRET_ACCESS_KEY") &&
      readEnv("AWS_ENDPOINT_URL_S3") &&
      readEnv("AWS_REGION"),
  );
}

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      forcePathStyle: true,
      region: requireEnv("AWS_REGION"),
      endpoint: requireEnv("AWS_ENDPOINT_URL_S3"),
      credentials: {
        accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export function assertImage(contentType: string, size: number): void {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as ImageContentType)) {
    throw badRequest("Unsupported image content type.");
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    throw badRequest("Image size must be between 1 byte and 5 MB.");
  }
}

export function normalizeObjectKey(key: string): string {
  const value = key.trim();
  if (
    !value ||
    value.length > 1024 ||
    value.startsWith("/") ||
    value.includes("..") ||
    !/^[A-Za-z0-9/_-]+(?:\.[A-Za-z0-9]+)?$/.test(value)
  ) {
    throw badRequest("Invalid object key.");
  }
  return value;
}

export function makeObjectKey(
  scope: UploadScope,
  contentType: ImageContentType,
): string {
  const id = crypto.randomUUID();
  return `${STORAGE_PREFIXES[scope]}/${id}.${EXTENSIONS[contentType]}`;
}

export function isExternalStoredFile(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

export function isStoredObjectKey(value: string): boolean {
  if (!value || isExternalStoredFile(value)) return false;
  try {
    normalizeObjectKey(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidStoredFileForScope(
  value: string,
  scope: UploadScope,
): boolean {
  if (!value) return false;
  if (isExternalStoredFile(value)) return true;
  if (!isStoredObjectKey(value)) return false;
  return normalizeObjectKey(value).startsWith(`${STORAGE_PREFIXES[scope]}/`);
}

export async function createUploadUrl(
  key: string,
  contentType: ImageContentType,
  expiresIn = 900,
): Promise<string> {
  const objectKey = normalizeObjectKey(key);
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}

export async function createDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const objectKey = normalizeObjectKey(key);
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: objectKey }),
    { expiresIn },
  );
}

export async function deleteObject(key: string): Promise<void> {
  const objectKey = normalizeObjectKey(key);
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: objectKey }),
    );
  } catch {
    return;
  }
}

export async function deleteManagedObject(value: string | null): Promise<void> {
  if (value && isStoredObjectKey(value)) {
    await deleteObject(value);
  }
}

export async function resolveStoredFile(
  value: string | null,
  expiresIn = 3600,
): Promise<string | null> {
  if (!value) return null;
  if (isExternalStoredFile(value)) return value;
  if (!isStorageConfigured()) return value;
  try {
    return await createDownloadUrl(value, expiresIn);
  } catch {
    return value;
  }
}
