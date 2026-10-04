import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

function hasR2() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });
}

export async function putMedia(key: string, body: Buffer, contentType: string) {
  if (hasR2()) {
    await r2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
    const url = base ? `${base}/${key}` : `r2://${process.env.R2_BUCKET_NAME}/${key}`;
    return { key, url, storage: "r2" as const };
  }

  const dest = path.join(UPLOAD_DIR, key);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
  return { key, url: `/uploads/${key}`, storage: "local" as const };
}

export function localUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}
