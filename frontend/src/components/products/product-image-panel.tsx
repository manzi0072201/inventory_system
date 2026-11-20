"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { uploadImage } from "@/lib/api";

export const DEFAULT_IMAGE_BG = "#f3f4f6";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function isExternalImage(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

type ProductImagePanelProps = {
  image: string;
  imageBg: string;
  onImage: (value: string) => void;
  onImageBg: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

export function ProductImagePanel({
  image,
  imageBg,
  onImage,
  onImageBg,
  onBusyChange,
}: ProductImagePanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImageBroken(false);
    setFileError(null);
  }, [image]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFileError("Please choose a PNG, JPG, WebP, or GIF image");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("That image is too large (over 5 MB)");
      return;
    }
    setUploading(true);
    onBusyChange?.(true);
    const nextPreview = URL.createObjectURL(file);
    try {
      const key = await uploadImage("product", file);
      onImage(key);
      setPreviewUrl(nextPreview);
      setImageBroken(false);
      setFileError(null);
    } catch {
      URL.revokeObjectURL(nextPreview);
      setFileError("The image could not be uploaded — try again");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  const isUploaded = Boolean(image) && !isExternalImage(image);
  const previewSource = previewUrl ?? (isExternalImage(image) ? image : "");

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Product Image</h2>
      </div>
      <div className="panel-body form-body image-body">
        <div
          className={`product-thumb create-thumb${
            dragOver ? " drag-over" : ""
          }`}
          style={{ background: imageBg || DEFAULT_IMAGE_BG }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
        >
          {previewSource && !imageBroken ? (
            <img
              src={previewSource}
              alt="Product preview"
              onError={() => setImageBroken(true)}
            />
          ) : (
            <Icon name="products" className="create-thumb-fallback" />
          )}
        </div>
        <p className="drop-hint">
          Drag &amp; drop an image here, or use the button below
        </p>
        {imageBroken && (
          <p className="field-error">This image could not be loaded</p>
        )}
        <div className="filter-field">
          <label id="product-file-label">Upload from device</label>
          <div className="image-source-row">
            <button
              type="button"
              className="ghost-button"
              aria-labelledby="product-file-label"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="upload" className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Choose file"}
            </button>
            {image && (
              <button
                type="button"
                className="ghost-button"
                disabled={uploading}
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  onImage("");
                  setImageBroken(false);
                  setFileError(null);
                }}
              >
                <Icon name="trash" className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="file-input-hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
          {fileError && <p className="field-error">{fileError}</p>}
        </div>
        <div className="filter-field">
          <label htmlFor="product-image">…or paste an image URL</label>
          <input
            id="product-image"
            className="filter-input"
            placeholder="https://…"
            type="text"
            value={isUploaded ? "" : image}
            onChange={(event) => onImage(event.target.value)}
          />
          {isUploaded && (
            <p className="image-note">
              Using an uploaded image from your device
            </p>
          )}
        </div>
        <div className="filter-field">
          <label htmlFor="product-image-bg">Thumbnail background</label>
          <div className="color-row">
            <input
              id="product-image-bg"
              className="color-input"
              type="color"
              value={imageBg || DEFAULT_IMAGE_BG}
              onChange={(event) => onImageBg(event.target.value)}
            />
            <span className="color-value">{imageBg}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
