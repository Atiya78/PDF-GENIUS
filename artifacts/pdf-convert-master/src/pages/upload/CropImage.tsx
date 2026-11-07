import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageToolShell } from "@/components/image-tools/ImageToolShell";
import { ImageDropzone } from "@/components/image-tools/ImageDropzone";
import { OutputActions } from "@/components/image-tools/OutputActions";
import {
  canvasToBlob,
  mimeTypeForExtension,
  exportExtension,
  withSuffix,
} from "@/lib/imageTools";

const ACCEPTED = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
const MAX_MB = 20;

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

function centeredCrop(mediaWidth: number, mediaHeight: number, aspect?: number): Crop {
  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
      mediaWidth,
      mediaHeight,
    );
  }
  return { unit: "%", x: 5, y: 5, width: 90, height: 90 };
}

// Convert a percentage-based crop into the pixel crop the export math expects.
// Used so a freshly applied default/aspect crop is immediately actionable,
// without waiting for the user to drag (which is what fires `onComplete`).
function toPixelCrop(c: Crop, mediaWidth: number, mediaHeight: number): PixelCrop {
  if (c.unit === "px") return c as PixelCrop;
  return {
    unit: "px",
    x: (c.x / 100) * mediaWidth,
    y: (c.y / 100) * mediaHeight,
    width: (c.width / 100) * mediaWidth,
    height: (c.height / 100) * mediaHeight,
  };
}

export const CropImageUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  const handleFile = useCallback((f: File) => {
    const url = URL.createObjectURL(f);
    setFile(f);
    setImgUrl(url);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  // Revoke the preview object URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
  }, [imgUrl]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const c = centeredCrop(width, height, aspect);
    setCrop(c);
    setCompletedCrop(toPixelCrop(c, width, height));
  };

  const changeAspect = (a?: number) => {
    setAspect(a);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const c = centeredCrop(width, height, a);
      setCrop(c);
      setCompletedCrop(toPixelCrop(c, width, height));
    }
  };

  const getBlob = async () => {
    const img = imgRef.current;
    if (!img || !completedCrop || completedCrop.width === 0 || !file) {
      throw new Error("Select a crop area first");
    }
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(completedCrop.width * scaleX);
    canvas.height = Math.round(completedCrop.height * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    const outExt = exportExtension(file.name);
    if (outExt === "jpg" || outExt === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvasToBlob(canvas, mimeTypeForExtension(outExt), 0.95);
  };

  const reset = () => {
    setFile(null);
    setImgUrl(null);
    imgRef.current = null;
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const outName = file ? withSuffix(file.name, "cropped", exportExtension(file.name)) : "cropped.png";

  const outputW =
    completedCrop && imgRef.current
      ? Math.round(completedCrop.width * (imgRef.current.naturalWidth / imgRef.current.width))
      : 0;
  const outputH =
    completedCrop && imgRef.current
      ? Math.round(completedCrop.height * (imgRef.current.naturalHeight / imgRef.current.height))
      : 0;

  return (
    <ImageToolShell
      title="Image Cropper"
      description="Crop images with an interactive selection. Lock to preset aspect ratios or crop freely, then download or save to the server."
      icon={<CropIcon className="w-8 h-8 text-[#c8302a]" />}
      iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      hideHeader={!file}
    >
      {!file ? (
        <ImageDropzone
          acceptedFormats={ACCEPTED}
          maxSizeMB={MAX_MB}
          onFile={handleFile}
          toolId="crop-images"
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 rounded-xl border border-[#e7e0d5] dark:border-gray-700 bg-[#faf7f2] dark:bg-gray-900 p-4 flex items-center justify-center min-h-[300px]">
            {imgUrl && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
              >
                <img
                  ref={imgRef}
                  src={imgUrl}
                  alt="crop"
                  onLoad={onImageLoad}
                  style={{ maxHeight: "440px" }}
                  data-testid="img-crop"
                />
              </ReactCrop>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Aspect ratio</Label>
              <div className="flex flex-wrap gap-2">
                {ASPECTS.map((a) => (
                  <Button
                    key={a.label}
                    variant={aspect === a.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeAspect(a.value)}
                    data-testid={`button-aspect-${a.label.replace(":", "-")}`}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>

            {outputW > 0 && (
              <div className="text-sm text-[#57534e] dark:text-gray-300" data-testid="text-crop-size">
                Output: {outputW} × {outputH}px
              </div>
            )}

            <div className="pt-3 border-t border-[#e7e0d5] dark:border-gray-700">
              <OutputActions
                getBlob={getBlob}
                filename={outName}
                disabled={!completedCrop || completedCrop.width === 0}
              />
            </div>

            <Button
              variant="ghost"
              onClick={reset}
              className="text-[#57534e]"
              data-testid="button-reset"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Choose a different image
            </Button>
          </div>
        </div>
      )}
    </ImageToolShell>
  );
};
