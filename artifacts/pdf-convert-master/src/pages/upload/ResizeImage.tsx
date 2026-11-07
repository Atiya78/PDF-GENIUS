import { useState, useRef, useCallback, useEffect } from "react";
import { Maximize2, RefreshCw, Lock, Unlock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImageToolShell } from "@/components/image-tools/ImageToolShell";
import { ImageDropzone } from "@/components/image-tools/ImageDropzone";
import { OutputActions } from "@/components/image-tools/OutputActions";
import {
  loadImageFromFile,
  canvasToBlob,
  mimeTypeForExtension,
  exportExtension,
  withSuffix,
  formatBytes,
} from "@/lib/imageTools";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
const MAX_MB = 20;

export const ResizeImageUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [lockAspect, setLockAspect] = useState(true);

  const aspect = natural ? natural.w / natural.h : 1;

  // Revoke the preview object URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
  }, [imgUrl]);

  const handleFile = useCallback(
    async (f: File) => {
      try {
        const { img, url } = await loadImageFromFile(f);
        imgRef.current = img;
        setFile(f);
        setImgUrl(url);
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
      } catch (e) {
        toast({
          title: "Could not load image",
          description: e instanceof Error ? e.message : "Error",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const onWidthChange = (val: number) => {
    const w = Math.max(1, Math.round(val || 0));
    setWidth(w);
    if (lockAspect && natural) setHeight(Math.max(1, Math.round(w / aspect)));
  };

  const onHeightChange = (val: number) => {
    const h = Math.max(1, Math.round(val || 0));
    setHeight(h);
    if (lockAspect && natural) setWidth(Math.max(1, Math.round(h * aspect)));
  };

  const applyPercentage = (pct: number) => {
    if (!natural) return;
    setWidth(Math.max(1, Math.round((natural.w * pct) / 100)));
    setHeight(Math.max(1, Math.round((natural.h * pct) / 100)));
  };

  const reset = () => {
    setFile(null);
    setImgUrl(null);
    imgRef.current = null;
    setNatural(null);
    setWidth(0);
    setHeight(0);
  };

  const getBlob = async () => {
    if (!imgRef.current || !file) throw new Error("No image loaded");
    const outExt = exportExtension(file.name);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    if (outExt === "jpg" || outExt === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgRef.current, 0, 0, width, height);
    return canvasToBlob(canvas, mimeTypeForExtension(outExt), 0.95);
  };

  const outName = file
    ? withSuffix(file.name, `${width}x${height}`, exportExtension(file.name))
    : "resized.png";

  return (
    <ImageToolShell
      title="Image Resizer"
      description="Resize images to exact dimensions or scale by percentage. Lock the aspect ratio to avoid distortion, then download or save to the server."
      icon={<Maximize2 className="w-8 h-8 text-[#c8302a]" />}
      iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      hideHeader={!file}
    >
      {!file ? (
        <ImageDropzone
          acceptedFormats={ACCEPTED}
          maxSizeMB={MAX_MB}
          onFile={handleFile}
          toolId="resize-images"
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="rounded-xl border border-[#e7e0d5] dark:border-gray-700 bg-[#faf7f2] dark:bg-gray-900 p-4 flex items-center justify-center min-h-[260px]">
              {imgUrl && (
                <img
                  src={imgUrl}
                  alt="preview"
                  className="max-h-[360px] max-w-full object-contain rounded"
                  data-testid="img-preview"
                />
              )}
            </div>
            {natural && (
              <div className="text-sm text-[#57534e] dark:text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
                <span data-testid="text-original-size">
                  Original: {natural.w} × {natural.h}px
                </span>
                <span
                  className="font-semibold text-[#c8302a] dark:text-[#c8302a]"
                  data-testid="text-new-size"
                >
                  New: {width} × {height}px
                </span>
                <span>{formatBytes(file.size)}</span>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="resize-w">Width (px)</Label>
                <Input
                  id="resize-w"
                  type="number"
                  min={1}
                  value={width || ""}
                  onChange={(e) => onWidthChange(parseInt(e.target.value))}
                  data-testid="input-width"
                />
              </div>
              <div>
                <Label htmlFor="resize-h">Height (px)</Label>
                <Input
                  id="resize-h"
                  type="number"
                  min={1}
                  value={height || ""}
                  onChange={(e) => onHeightChange(parseInt(e.target.value))}
                  data-testid="input-height"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="lock-aspect"
                checked={lockAspect}
                onCheckedChange={setLockAspect}
                data-testid="switch-lock-aspect"
              />
              <Label htmlFor="lock-aspect" className="flex items-center gap-1 cursor-pointer">
                {lockAspect ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                Lock aspect ratio
              </Label>
            </div>

            <div>
              <Label className="mb-2 block">Quick scale</Label>
              <div className="flex flex-wrap gap-2">
                {[25, 50, 75, 100].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPercentage(p)}
                    data-testid={`button-scale-${p}`}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#e7e0d5] dark:border-gray-700">
              <OutputActions getBlob={getBlob} filename={outName} disabled={!width || !height} />
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
