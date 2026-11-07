import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ImageToolShell } from "@/components/image-tools/ImageToolShell";
import { ImageDropzone } from "@/components/image-tools/ImageDropzone";
import { OutputActions } from "@/components/image-tools/OutputActions";
import {
  loadImageFromFile,
  canvasToBlob,
  mimeTypeForExtension,
  exportExtension,
  getExtension,
  withSuffix,
} from "@/lib/imageTools";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
const MAX_MB = 20;

export const RotateImageUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [angle, setAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Render the rotated/flipped image to the visible canvas — this canvas is both
  // the live preview AND the source for the downloaded/uploaded output.
  const render = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rad = (angle * Math.PI) / 180;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const newW = Math.round(w * cos + h * sin);
    const newH = Math.round(w * sin + h * cos);
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, newW, newH);
    const ext = file ? getExtension(file.name) : "png";
    if (!["png", "webp", "gif"].includes(ext)) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, newW, newH);
    }
    ctx.save();
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -w / 2, -h / 2);
    ctx.restore();
  }, [angle, flipH, flipV, file]);

  useEffect(() => {
    if (loaded) render();
  }, [loaded, render]);

  // Revoke the source object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFile = useCallback(
    async (f: File) => {
      try {
        const { img, url } = await loadImageFromFile(f);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        imgRef.current = img;
        setFile(f);
        setAngle(0);
        setFlipH(false);
        setFlipV(false);
        setLoaded(true);
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

  const getBlob = async () => {
    if (!file) throw new Error("No image loaded");
    render();
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas not ready");
    const outExt = exportExtension(file.name);
    return canvasToBlob(canvas, mimeTypeForExtension(outExt), 0.95);
  };

  const reset = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setFile(null);
    imgRef.current = null;
    setLoaded(false);
    setAngle(0);
    setFlipH(false);
    setFlipV(false);
  };

  const outName = file ? withSuffix(file.name, "rotated", exportExtension(file.name)) : "rotated.png";

  return (
    <ImageToolShell
      title="Image Rotator"
      description="Rotate by 90° steps or any custom angle, flip horizontally or vertically, and preview live before you download or save to the server."
      icon={<RotateCw className="w-8 h-8 text-[#c8302a]" />}
      iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
      hideHeader={!file}
    >
      {!file ? (
        <ImageDropzone
          acceptedFormats={ACCEPTED}
          maxSizeMB={MAX_MB}
          onFile={handleFile}
          toolId="rotate-images"
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl border border-[#e7e0d5] dark:border-gray-700 bg-[#faf7f2] dark:bg-gray-900 p-4 flex items-center justify-center min-h-[300px]">
            <canvas
              ref={canvasRef}
              className="max-h-[380px] max-w-full object-contain"
              data-testid="canvas-rotate"
            />
          </div>

          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Quick rotate</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAngle((a) => (a + 270) % 360)}
                  data-testid="button-rotate-left"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  90° left
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAngle((a) => (a + 90) % 360)}
                  data-testid="button-rotate-right"
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  90° right
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAngle((a) => (a + 180) % 360)}
                  data-testid="button-rotate-180"
                >
                  180°
                </Button>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Custom angle</Label>
                <span className="text-sm font-medium" data-testid="text-angle">
                  {angle}°
                </span>
              </div>
              <Slider
                min={0}
                max={360}
                step={1}
                value={[angle]}
                onValueChange={(v) => setAngle(v[0])}
                data-testid="slider-angle"
              />
            </div>

            <div>
              <Label className="mb-2 block">Flip</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={flipH ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlipH((v) => !v)}
                  data-testid="button-flip-h"
                >
                  <FlipHorizontal className="w-4 h-4 mr-1" />
                  Horizontal
                </Button>
                <Button
                  variant={flipV ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFlipV((v) => !v)}
                  data-testid="button-flip-v"
                >
                  <FlipVertical className="w-4 h-4 mr-1" />
                  Vertical
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e7e0d5] dark:border-gray-700">
              <OutputActions getBlob={getBlob} filename={outName} />
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
