import { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Maximize2,
  Crop as CropIcon,
  RotateCw,
  RotateCcw,
  Lock,
  Unlock,
  Download,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageToolShell } from "@/components/image-tools/ImageToolShell";
import { ImageDropzone } from "@/components/image-tools/ImageDropzone";
import { useToast } from "@/hooks/use-toast";
import {
  loadImageFromUrl,
  canvasToBlob,
  downloadBlob,
  mimeTypeForExtension,
  exportExtension,
  withSuffix,
  formatBytes,
} from "@/lib/imageTools";

const ACCEPTED = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
const MAX_MB = 20;
const MAX_DIM = 10000;

type Operation = "resize" | "crop" | "rotate";

export interface WorkingImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  name: string;
}

// Whether the working image's export format keeps transparency. JPEG output
// needs a white background filled behind the image.
function needsWhiteBackground(name: string): boolean {
  const ext = exportExtension(name);
  return ext === "jpg" || ext === "jpeg";
}

/* ----------------------------- Resize modal ----------------------------- */

export function ResizeModal({
  image,
  onApply,
  onCancel,
}: {
  image: WorkingImage;
  onApply: (blob: Blob, label: string) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [width, setWidth] = useState<number>(image.width);
  const [height, setHeight] = useState<number>(image.height);
  const [lock, setLock] = useState(true);
  const [busy, setBusy] = useState(false);
  const aspect = image.width / image.height;

  const changeWidth = (val: number) => {
    setWidth(val);
    if (lock && val > 0) setHeight(Math.max(1, Math.round(val / aspect)));
  };
  const changeHeight = (val: number) => {
    setHeight(val);
    if (lock && val > 0) setWidth(Math.max(1, Math.round(val * aspect)));
  };

  const apply = async () => {
    if (!width || !height || width < 1 || height < 1) {
      toast({ title: "Invalid size", description: "Width and height must be at least 1px.", variant: "destructive" });
      return;
    }
    if (width > MAX_DIM || height > MAX_DIM) {
      toast({ title: "Too large", description: `Maximum dimension is ${MAX_DIM}px.`, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const img = await loadImageFromUrl(image.url);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      if (needsWhiteBackground(image.name)) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, mimeTypeForExtension(exportExtension(image.name)), 0.95);
      onApply(blob, `Resized to ${width}×${height}`);
    } catch (e) {
      toast({
        title: "Resize failed",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-resize">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-[#c8302a]" /> Resize Image
          </DialogTitle>
          <DialogDescription>
            Current size {image.width} × {image.height}px. Enter a new size in pixels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resize-width" className="mb-1.5 block">Width (px)</Label>
              <Input
                id="resize-width"
                type="number"
                min={1}
                value={width || ""}
                onChange={(e) => changeWidth(parseInt(e.target.value, 10) || 0)}
                data-testid="input-resize-width"
              />
            </div>
            <div>
              <Label htmlFor="resize-height" className="mb-1.5 block">Height (px)</Label>
              <Input
                id="resize-height"
                type="number"
                min={1}
                value={height || ""}
                onChange={(e) => changeHeight(parseInt(e.target.value, 10) || 0)}
                data-testid="input-resize-height"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={lock} onCheckedChange={setLock} id="resize-lock" data-testid="switch-lock-aspect" />
            <Label htmlFor="resize-lock" className="flex items-center gap-1.5 cursor-pointer">
              {lock ? <Lock className="w-4 h-4 text-[#c8302a]" /> : <Unlock className="w-4 h-4 text-[#8a837b]" />}
              Lock aspect ratio
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="button-resize-cancel">Cancel</Button>
          <Button onClick={apply} disabled={busy} className="bg-[#f7433d] hover:bg-[#c8302a] text-white" data-testid="button-resize-apply">
            Apply Resize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Crop modal ------------------------------ */

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
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

export function CropModal({
  image,
  onApply,
  onCancel,
}: {
  image: WorkingImage;
  onApply: (blob: Blob, label: string) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // Natural-resolution scale factors (display px -> source px).
  const scale = () => {
    const img = imgRef.current;
    if (!img) return { x: 1, y: 1 };
    return { x: img.naturalWidth / img.width, y: img.naturalHeight / img.height };
  };

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

  // Natural-pixel values shown in the manual inputs.
  const s = scale();
  const naturalCrop = completedCrop
    ? {
        x: Math.round(completedCrop.x * s.x),
        y: Math.round(completedCrop.y * s.y),
        width: Math.round(completedCrop.width * s.x),
        height: Math.round(completedCrop.height * s.y),
      }
    : { x: 0, y: 0, width: 0, height: 0 };

  const setNatural = (field: "x" | "y" | "width" | "height", value: number) => {
    const img = imgRef.current;
    if (!img) return;
    const next = { ...naturalCrop, [field]: Math.max(0, value) };
    // Clamp to image bounds.
    next.width = Math.min(next.width, img.naturalWidth);
    next.height = Math.min(next.height, img.naturalHeight);
    next.x = Math.min(next.x, img.naturalWidth - next.width);
    next.y = Math.min(next.y, img.naturalHeight - next.height);
    const px: PixelCrop = {
      unit: "px",
      x: next.x / s.x,
      y: next.y / s.y,
      width: next.width / s.x,
      height: next.height / s.y,
    };
    setAspect(undefined);
    setCrop(px);
    setCompletedCrop(px);
  };

  const apply = async () => {
    const img = imgRef.current;
    if (!img || !completedCrop || naturalCrop.width < 1 || naturalCrop.height < 1) {
      toast({ title: "Select a crop area", description: "Choose a region with a width and height of at least 1px.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(naturalCrop.width);
      canvas.height = Math.round(naturalCrop.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      if (needsWhiteBackground(image.name)) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        naturalCrop.x,
        naturalCrop.y,
        naturalCrop.width,
        naturalCrop.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await canvasToBlob(canvas, mimeTypeForExtension(exportExtension(image.name)), 0.95);
      onApply(blob, `Cropped to ${canvas.width}×${canvas.height}`);
    } catch (e) {
      toast({
        title: "Crop failed",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-3xl" data-testid="modal-crop">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-[#c8302a]" /> Crop Image
          </DialogTitle>
          <DialogDescription>Drag to select a region, or set exact pixel values below.</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 py-2">
          <div className="md:col-span-2 rounded-xl border border-[#e7e0d5] dark:border-gray-700 bg-[#faf7f2] dark:bg-gray-900 p-3 flex items-center justify-center min-h-[280px]">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img
                ref={imgRef}
                src={image.url}
                alt="crop"
                onLoad={onImageLoad}
                style={{ maxHeight: "420px" }}
                data-testid="img-crop"
              />
            </ReactCrop>
          </div>

          <div className="space-y-4">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="crop-x" className="mb-1 block text-xs">X</Label>
                <Input id="crop-x" type="number" min={0} value={naturalCrop.x}
                  onChange={(e) => setNatural("x", parseInt(e.target.value, 10) || 0)} data-testid="input-crop-x" />
              </div>
              <div>
                <Label htmlFor="crop-y" className="mb-1 block text-xs">Y</Label>
                <Input id="crop-y" type="number" min={0} value={naturalCrop.y}
                  onChange={(e) => setNatural("y", parseInt(e.target.value, 10) || 0)} data-testid="input-crop-y" />
              </div>
              <div>
                <Label htmlFor="crop-w" className="mb-1 block text-xs">Width</Label>
                <Input id="crop-w" type="number" min={1} value={naturalCrop.width}
                  onChange={(e) => setNatural("width", parseInt(e.target.value, 10) || 0)} data-testid="input-crop-width" />
              </div>
              <div>
                <Label htmlFor="crop-h" className="mb-1 block text-xs">Height</Label>
                <Input id="crop-h" type="number" min={1} value={naturalCrop.height}
                  onChange={(e) => setNatural("height", parseInt(e.target.value, 10) || 0)} data-testid="input-crop-height" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="button-crop-cancel">Cancel</Button>
          <Button onClick={apply} disabled={busy} className="bg-[#f7433d] hover:bg-[#c8302a] text-white" data-testid="button-crop-apply">
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Rotate modal ----------------------------- */

export function RotateModal({
  image,
  onApply,
  onCancel,
}: {
  image: WorkingImage;
  onApply: (blob: Blob, label: string) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [angle, setAngle] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  // Render the rotated image onto the preview canvas; this canvas is also the
  // export source so the preview is exactly what gets applied.
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
    if (needsWhiteBackground(image.name)) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, newW, newH);
    }
    ctx.save();
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -w / 2, -h / 2);
    ctx.restore();
  }, [angle, image.name]);

  useEffect(() => {
    let cancelled = false;
    loadImageFromUrl(image.url)
      .then((img) => {
        if (cancelled) return;
        imgRef.current = img;
        setLoaded(true);
      })
      .catch(() => {
        toast({ title: "Could not load image", variant: "destructive" });
      });
    return () => {
      cancelled = true;
    };
  }, [image.url, toast]);

  useEffect(() => {
    if (loaded) render();
  }, [loaded, render]);

  const quick = (delta: number) => setAngle((a) => (((a + delta) % 360) + 360) % 360);

  const apply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      render();
      const blob = await canvasToBlob(canvas, mimeTypeForExtension(exportExtension(image.name)), 0.95);
      onApply(blob, `Rotated ${angle}°`);
    } catch (e) {
      toast({
        title: "Rotate failed",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl" data-testid="modal-rotate">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCw className="w-5 h-5 text-[#c8302a]" /> Rotate Image
          </DialogTitle>
          <DialogDescription>Use the slider for any angle, or the quick buttons for 90°/180°.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-xl border border-[#e7e0d5] dark:border-gray-700 bg-[#faf7f2] dark:bg-gray-900 p-3 flex items-center justify-center min-h-[260px]">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[360px] object-contain"
              data-testid="canvas-rotate-preview"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => quick(-90)} data-testid="button-rotate-left">
              <RotateCcw className="w-4 h-4 mr-1.5" /> 90° Left
            </Button>
            <Button variant="outline" size="sm" onClick={() => quick(90)} data-testid="button-rotate-right">
              <RotateCw className="w-4 h-4 mr-1.5" /> 90° Right
            </Button>
            <Button variant="outline" size="sm" onClick={() => quick(180)} data-testid="button-rotate-180">
              180°
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Angle</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isNaN(v)) return setAngle(0);
                    setAngle(Math.max(0, Math.min(360, v)));
                  }}
                  className="w-20"
                  data-testid="input-rotate-angle"
                />
                <span className="text-sm text-[#57534e]">°</span>
              </div>
            </div>
            <Slider
              value={[angle]}
              min={0}
              max={360}
              step={1}
              onValueChange={(v) => setAngle(v[0])}
              data-testid="slider-rotate-angle"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="button-rotate-cancel">Cancel</Button>
          <Button onClick={apply} disabled={busy || !loaded} className="bg-[#f7433d] hover:bg-[#c8302a] text-white" data-testid="button-rotate-apply">
            Apply Rotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------- Shared single-tool page shell -------------------- */

interface ToolConfig {
  tool: Operation;
  title: string;
  description: string;
  actionLabel: string;
  icon: JSX.Element;
}

function SingleImageTool({ tool, title, description, actionLabel, icon }: ToolConfig) {
  const { toast } = useToast();
  const [original, setOriginal] = useState<WorkingImage | null>(null);
  const [current, setCurrent] = useState<WorkingImage | null>(null);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Guards for async object-URL lifecycle: ignore (and revoke) any decode that
  // resolves after the component unmounts or after a newer action supersedes it.
  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Revoke any object URLs we still own on unmount.
  const originalUrlRef = useRef<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  useEffect(() => {
    originalUrlRef.current = original?.url ?? null;
  }, [original]);
  useEffect(() => {
    currentUrlRef.current = current?.url ?? null;
  }, [current]);
  useEffect(() => {
    return () => {
      const o = originalUrlRef.current;
      const c = currentUrlRef.current;
      if (o) URL.revokeObjectURL(o);
      if (c && c !== o) URL.revokeObjectURL(c);
    };
  }, []);

  const handleFile = useCallback(
    async (f: File) => {
      const url = URL.createObjectURL(f);
      const seq = ++loadSeqRef.current;
      try {
        const img = await loadImageFromUrl(url);
        if (!mountedRef.current || seq !== loadSeqRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        const ei: WorkingImage = {
          blob: f,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          name: f.name,
        };
        setOriginal(ei);
        setCurrent(ei);
        setHistory([]);
        setOpen(true); // jump straight into the tool once an image is ready
      } catch (e) {
        URL.revokeObjectURL(url);
        if (!mountedRef.current) return;
        toast({
          title: "Could not load image",
          description: e instanceof Error ? e.message : "Error",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const commit = useCallback(
    async (blob: Blob, label: string) => {
      const url = URL.createObjectURL(blob);
      const seq = ++loadSeqRef.current;
      try {
        const img = await loadImageFromUrl(url);
        if (!mountedRef.current || seq !== loadSeqRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        setCurrent((prev) => {
          if (prev && prev.url !== original?.url) URL.revokeObjectURL(prev.url);
          return {
            blob,
            url,
            width: img.naturalWidth,
            height: img.naturalHeight,
            name: prev?.name || original?.name || "image.png",
          };
        });
        setHistory((h) => [...h, label]);
        setOpen(false);
        toast({ title: "Applied", description: label });
      } catch (e) {
        URL.revokeObjectURL(url);
        if (!mountedRef.current) return;
        toast({
          title: "Could not apply edit",
          description: e instanceof Error ? e.message : "Error",
          variant: "destructive",
        });
      }
    },
    [original, toast],
  );

  const reset = useCallback(() => {
    loadSeqRef.current += 1; // invalidate any in-flight decode
    if (current && original && current.url !== original.url) URL.revokeObjectURL(current.url);
    if (original) URL.revokeObjectURL(original.url);
    setOriginal(null);
    setCurrent(null);
    setHistory([]);
    setOpen(false);
  }, [current, original]);

  const revertToOriginal = useCallback(() => {
    if (!original) return;
    loadSeqRef.current += 1; // invalidate any in-flight decode
    setCurrent((prev) => {
      if (prev && prev.url !== original.url) URL.revokeObjectURL(prev.url);
      return original;
    });
    setHistory([]);
    toast({ title: "Reverted", description: "Restored the original image." });
  }, [original, toast]);

  const download = useCallback(() => {
    if (!current) return;
    const name = withSuffix(current.name, "edited", exportExtension(current.name));
    downloadBlob(current.blob, name);
    toast({ title: "Download started", description: name });
  }, [current, toast]);

  return (
    <ImageToolShell
      title={title}
      description={description}
      icon={icon}
      iconBg="bg-[#fdece9] border-[#f5b5b0] dark:bg-[#c8302a] dark:border-[#c8302a]"
    >
      {!current ? (
        <ImageDropzone
          acceptedFormats={ACCEPTED}
          maxSizeMB={MAX_MB}
          onFile={handleFile}
          toolId={tool === "resize" ? "resize-images" : tool === "crop" ? "crop-images" : "rotate-images"}
        />
      ) : (
        <div className="space-y-6">
          {/* Preview */}
          <div className="rounded-xl border border-[#e7e0d5] dark:border-gray-700 bg-[#faf7f2] dark:bg-gray-900 p-4 flex flex-col items-center justify-center min-h-[300px]">
            <img
              src={current.url}
              alt="Working preview"
              className="max-h-[440px] max-w-full object-contain rounded"
              data-testid="img-preview"
            />
            <p className="mt-3 text-sm text-[#57534e] dark:text-[#8a837b]" data-testid="text-image-meta">
              {current.width} × {current.height}px • {formatBytes(current.blob.size)}
            </p>
          </div>

          {/* Open the tool */}
          <div>
            <Button
              onClick={() => setOpen(true)}
              className="bg-[#f7433d] hover:bg-[#c8302a] text-white"
              data-testid="button-open-tool"
            >
              {actionLabel}
            </Button>
          </div>

          {/* Applied operations */}
          {history.length > 0 && (
            <div className="rounded-lg bg-[#faf7f2] dark:bg-gray-900 border border-[#e7e0d5] dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#57534e] dark:text-gray-200 mb-1.5">
                <Layers className="w-4 h-4 text-[#c8302a]" /> Applied edits
              </div>
              <ol className="text-sm text-[#57534e] dark:text-gray-300 list-decimal list-inside space-y-0.5" data-testid="list-history">
                {history.map((h, i) => (
                  <li key={i} data-testid={`text-history-${i}`}>{h}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Output actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e7e0d5] dark:border-gray-700">
            <Button onClick={download} className="bg-[#f7433d] hover:bg-[#c8302a] text-white" data-testid="button-download">
              <Download className="w-4 h-4 mr-2" /> Download Image
            </Button>
            {history.length > 0 && (
              <Button variant="outline" onClick={revertToOriginal} data-testid="button-revert">
                <RefreshCw className="w-4 h-4 mr-2" /> Revert to original
              </Button>
            )}
            <Button variant="ghost" onClick={reset} className="text-[#57534e]" data-testid="button-new-image">
              Choose a different image
            </Button>
          </div>
        </div>
      )}

      {open && current && tool === "resize" && (
        <ResizeModal image={current} onApply={commit} onCancel={() => setOpen(false)} />
      )}
      {open && current && tool === "crop" && (
        <CropModal image={current} onApply={commit} onCancel={() => setOpen(false)} />
      )}
      {open && current && tool === "rotate" && (
        <RotateModal image={current} onApply={commit} onCancel={() => setOpen(false)} />
      )}
    </ImageToolShell>
  );
}

/* ------------------------- Exported tool pages -------------------------- */

export const ResizeImageTool = () => (
  <SingleImageTool
    tool="resize"
    title="Resize Image"
    description="Upload an image and set a new width and height. Lock the aspect ratio to keep proportions — all in your browser."
    actionLabel="Resize Image"
    icon={<Maximize2 className="w-8 h-8 text-[#c8302a]" />}
  />
);

export const CropImageTool = () => (
  <SingleImageTool
    tool="crop"
    title="Crop Image"
    description="Upload an image and trim it to a selection — drag the box or set exact pixel values, with optional aspect presets."
    actionLabel="Crop Image"
    icon={<CropIcon className="w-8 h-8 text-[#c8302a]" />}
  />
);

export const RotateImageTool = () => (
  <SingleImageTool
    tool="rotate"
    title="Rotate Image"
    description="Upload an image and rotate it to any angle with a live preview, or snap to 90° / 180° — all in your browser."
    actionLabel="Rotate Image"
    icon={<RotateCw className="w-8 h-8 text-[#c8302a]" />}
  />
);
