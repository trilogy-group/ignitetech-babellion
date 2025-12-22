import { useState, useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Rect, Text, Transformer } from "react-konva";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MousePointer2, Pencil, Square, Type, Undo2, Trash2, Palette, Upload, MoreHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Drawing tool types
type DrawingTool = 'select' | 'pencil' | 'rectangle' | 'text';

// Shape types
interface BaseShape {
  id: string;
  type: string;
}

interface LineShape extends BaseShape {
  type: 'line';
  points: number[];
  stroke: string;
  strokeWidth: number;
}

interface RectShape extends BaseShape {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
}

interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
}

type Shape = LineShape | RectShape | TextShape;

// Color presets
const colorPresets = [
  '#FFFFFF',  // White (eraser/clear)
  '#000000',  // Black
  '#FF0000',  // Red
  '#FF6B00',  // Orange
  '#FFEB3B',  // Yellow
  '#4CAF50',  // Green
  '#2196F3',  // Blue
  '#9C27B0',  // Purple
];

interface DrawingCanvasProps {
  imageUrl: string | null;
  stageRef: React.RefObject<Konva.Stage>;
  disabled?: boolean;
  onUploadClick?: () => void;
  onAnnotationChange?: (hasAnnotations: boolean) => void; // Called when annotation state changes
  maxWidth?: number;
  maxHeight?: number;
  fillContainer?: boolean; // If true, fills parent container and centers canvas
  isMobile?: boolean; // If true, renders compact mobile toolbar
}

export function DrawingCanvas({
  imageUrl,
  stageRef,
  disabled = false,
  onUploadClick,
  onAnnotationChange,
  maxWidth = 600,
  maxHeight = 500,
  fillContainer = false,
  isMobile = false,
}: DrawingCanvasProps) {
  // Container ref for measuring available space
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: maxWidth, height: maxHeight });

  // Measure container when fillContainer is true
  useEffect(() => {
    if (!fillContainer || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Reserve space for toolbar (~52px) when calculating available height
        setContainerSize({ width, height: Math.max(height - 60, 200) });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [fillContainer]);

  // Use container size or max props
  const effectiveMaxWidth = fillContainer ? containerSize.width : maxWidth;
  const effectiveMaxHeight = fillContainer ? containerSize.height : maxHeight;
  // Tool state
  const [currentTool, setCurrentTool] = useState<DrawingTool>('select');
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);

  // Drawing state
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Text input state
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const textInputJustOpened = useRef(false);

  // Image state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: maxWidth, height: maxHeight });

  // Transformer ref
  const transformerRef = useRef<Konva.Transformer>(null);

  // Load image when URL changes - also clear annotations when switching to a new image
  useEffect(() => {
    // Clear all annotations when image changes (new session selected)
    setShapes([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setCurrentShape(null);
    setIsDrawing(false);
    setTextInputVisible(false);
    setTextInputValue('');

    if (!imageUrl) {
      setImage(null);
      setStageSize({ width: effectiveMaxWidth, height: effectiveMaxHeight });
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate scale to fit within container while maintaining aspect ratio
      const scaleX = effectiveMaxWidth / img.width;
      const scaleY = effectiveMaxHeight / img.height;
      const scale = Math.min(scaleX, scaleY, 1); // Never upscale

      setStageSize({
        width: img.width * scale,
        height: img.height * scale,
      });
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl, effectiveMaxWidth, effectiveMaxHeight]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const stage = stageRef.current;
    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, stageRef]);

  // Save to history
  const saveToHistory = useCallback((newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newShapes]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Handle mouse down
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (disabled || !image) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Deselect if clicking on stage background
    if (e.target === stage) {
      setSelectedId(null);
    }

    if (currentTool === 'select') {
      // Selection is handled by clicking on shapes
      return;
    }

    if (currentTool === 'text') {
      // Show text input at click position
      setTextInputPosition({ x: pos.x, y: pos.y });
      setTextInputVisible(true);
      setTextInputValue('');
      // Prevent immediate blur from closing the input
      textInputJustOpened.current = true;
      setTimeout(() => {
        textInputRef.current?.focus();
        // Allow blur to work after a short delay
        setTimeout(() => {
          textInputJustOpened.current = false;
        }, 200);
      }, 10);
      return;
    }

    setIsDrawing(true);
    const id = `shape-${Date.now()}`;

    if (currentTool === 'pencil') {
      const newShape: LineShape = {
        id,
        type: 'line',
        points: [pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth,
      };
      setCurrentShape(newShape);
    } else if (currentTool === 'rectangle') {
      const newShape: RectShape = {
        id,
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth,
        fill: 'transparent',
      };
      setCurrentShape(newShape);
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || !currentShape || disabled) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (currentShape.type === 'line') {
      const updatedShape: LineShape = {
        ...currentShape,
        points: [...currentShape.points, pos.x, pos.y],
      };
      setCurrentShape(updatedShape);
    } else if (currentShape.type === 'rect') {
      const updatedShape: RectShape = {
        ...currentShape,
        width: pos.x - currentShape.x,
        height: pos.y - currentShape.y,
      };
      setCurrentShape(updatedShape);
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) {
      setIsDrawing(false);
      return;
    }

    // Only add shape if it has some size
    let shouldAdd = false;
    if (currentShape.type === 'line') {
      shouldAdd = currentShape.points.length > 2;
    } else if (currentShape.type === 'rect') {
      shouldAdd = Math.abs(currentShape.width) > 5 || Math.abs(currentShape.height) > 5;
    }

    if (shouldAdd) {
      const newShapes = [...shapes, currentShape];
      setShapes(newShapes);
      saveToHistory(newShapes);
    }

    setCurrentShape(null);
    setIsDrawing(false);
  };

  // Handle text input submit
  const handleTextSubmit = () => {
    // Prevent immediate blur from closing when input just opened
    if (textInputJustOpened.current) {
      return;
    }
    if (textInputValue.trim()) {
      const newShape: TextShape = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: textInputPosition.x,
        y: textInputPosition.y,
        text: textInputValue.trim(),
        fontSize,
        fill: strokeColor,
      };
      const newShapes = [...shapes, newShape];
      setShapes(newShapes);
      saveToHistory(newShapes);
    }
    setTextInputVisible(false);
    setTextInputValue('');
  };

  // Handle shape click for selection
  const handleShapeClick = (shapeId: string) => {
    if (currentTool === 'select') {
      setSelectedId(shapeId === selectedId ? null : shapeId);
    }
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes([...history[newIndex]]);
      setSelectedId(null);
    }
  };

  // Clear all
  const handleClear = () => {
    setShapes([]);
    saveToHistory([]);
    setSelectedId(null);
  };

  // Delete selected shape
  const handleDeleteSelected = () => {
    if (selectedId) {
      const newShapes = shapes.filter(s => s.id !== selectedId);
      setShapes(newShapes);
      saveToHistory(newShapes);
      setSelectedId(null);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !textInputVisible) {
          handleDeleteSelected();
        }
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setTextInputVisible(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, textInputVisible, historyIndex]);

  // Render shapes
  const renderShape = (shape: Shape) => {
    const isSelected = selectedId === shape.id;

    switch (shape.type) {
      case 'line':
        return (
          <Line
            key={shape.id}
            id={shape.id}
            points={shape.points}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            onClick={() => handleShapeClick(shape.id)}
            onTap={() => handleShapeClick(shape.id)}
          />
        );
      case 'rect':
        return (
          <Rect
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill={shape.fill}
            draggable={currentTool === 'select'}
            onClick={() => handleShapeClick(shape.id)}
            onTap={() => handleShapeClick(shape.id)}
          />
        );
      case 'text':
        return (
          <Text
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            text={shape.text}
            fontSize={shape.fontSize}
            fill={shape.fill}
            draggable={currentTool === 'select'}
            onClick={() => handleShapeClick(shape.id)}
            onTap={() => handleShapeClick(shape.id)}
          />
        );
    }
  };

  const canUndo = historyIndex > 0;
  const hasShapes = shapes.length > 0;

  // Notify parent when annotation state changes
  useEffect(() => {
    onAnnotationChange?.(hasShapes);
  }, [hasShapes, onAnnotationChange]);

  return (
    <div ref={containerRef} className={`flex flex-col gap-3 ${fillContainer ? 'h-full' : ''}`}>
      {/* Toolbar - Mobile vs Desktop */}
      {isMobile ? (
        /* Mobile Toolbar - Compact with More popover */
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg w-full">
          <div className="flex items-center gap-1">
            {/* Essential drawing tools */}
            <Button
              variant={currentTool === 'select' ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setCurrentTool('select')}
              disabled={disabled || !image}
            >
              <MousePointer2 className="h-5 w-5" />
            </Button>

            <Button
              variant={currentTool === 'pencil' ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setCurrentTool('pencil')}
              disabled={disabled || !image}
            >
              <Pencil className="h-5 w-5" />
            </Button>

            <Button
              variant={currentTool === 'rectangle' ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setCurrentTool('rectangle')}
              disabled={disabled || !image}
            >
              <Square className="h-5 w-5" />
            </Button>

            <Button
              variant={currentTool === 'text' ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setCurrentTool('text')}
              disabled={disabled || !image}
            >
              <Type className="h-5 w-5" />
            </Button>

            {/* Color picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  disabled={disabled || !image}
                >
                  <div
                    className="h-5 w-5 rounded border border-border"
                    style={{ 
                      backgroundColor: strokeColor,
                      boxShadow: strokeColor === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined
                    }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <div className="grid grid-cols-4 gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded border-2 transition-transform hover:scale-110 ${
                        strokeColor === color ? 'border-primary' : color === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setStrokeColor(color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Replace image button */}
            {onUploadClick && image && (
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={onUploadClick}
                disabled={disabled}
              >
                <Upload className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* More options popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                {/* Stroke size slider */}
                <div className="space-y-2 px-1">
                  <Label className="text-sm">Stroke Size: {strokeWidth}</Label>
                  <Slider
                    value={[strokeWidth]}
                    onValueChange={([value]) => setStrokeWidth(value)}
                    min={1}
                    max={20}
                    step={1}
                    disabled={disabled || !image}
                  />
                </div>

                {/* Text size slider */}
                <div className="space-y-2 px-1">
                  <Label className="text-sm">Text Size: {fontSize}px</Label>
                  <Slider
                    value={[fontSize]}
                    onValueChange={([value]) => setFontSize(value)}
                    min={12}
                    max={72}
                    step={4}
                    disabled={disabled || !image}
                  />
                </div>

                <div className="h-px bg-border" />

                {/* Undo */}
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleUndo}
                  disabled={disabled || !canUndo}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Undo
                </Button>

                {/* Clear */}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleClear}
                  disabled={disabled || !hasShapes}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        /* Desktop Toolbar - Full width with all tools */
        <div className="flex items-center gap-2 flex-wrap p-2 bg-muted/50 rounded-lg w-full">
          {/* Tool buttons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === 'select' ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentTool('select')}
                  disabled={disabled || !image}
                >
                  <MousePointer2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Select (V)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === 'pencil' ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentTool('pencil')}
                  disabled={disabled || !image}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pencil (P)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === 'rectangle' ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentTool('rectangle')}
                  disabled={disabled || !image}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rectangle (R)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === 'text' ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentTool('text')}
                  disabled={disabled || !image}
                >
                  <Type className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Text (T)</TooltipContent>
            </Tooltip>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={disabled || !image}
              >
                <div
                  className="h-4 w-4 rounded border border-border shadow-inner"
                  style={{ 
                    backgroundColor: strokeColor,
                    boxShadow: strokeColor === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined
                  }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-4 gap-1">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    className={`h-6 w-6 rounded border-2 transition-transform hover:scale-110 ${
                      strokeColor === color ? 'border-primary' : color === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setStrokeColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Stroke width selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Stroke:</span>
            <Select
              value={String(strokeWidth)}
              onValueChange={(value) => setStrokeWidth(Number(value))}
              disabled={disabled || !image}
            >
              <SelectTrigger className="h-8 w-14">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 8, 10, 15, 20].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font size selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Text:</span>
            <Select
              value={String(fontSize)}
              onValueChange={(value) => setFontSize(Number(value))}
              disabled={disabled || !image}
            >
              <SelectTrigger className="h-8 w-14">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[12, 16, 20, 24, 32, 40, 48, 64, 72].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Undo/Clear buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleUndo}
                disabled={disabled || !canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleClear}
                disabled={disabled || !hasShapes}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Canvas - centered when fillContainer */}
      <div className={`relative border rounded-lg bg-muted/30 ${fillContainer ? 'flex-1 flex items-center justify-center' : ''}`}>
        {!image ? (
          <div
            className="flex flex-col items-center justify-center text-muted-foreground"
            style={{ width: fillContainer ? '100%' : stageSize.width, height: fillContainer ? '100%' : stageSize.height }}
          >
            <Upload className="h-12 w-12 mb-3" />
            <p className="text-sm">Upload an image to start editing</p>
            {onUploadClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUploadClick}
                className="mt-3"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Image
              </Button>
            )}
          </div>
        ) : (
          <div className="relative" style={{ width: stageSize.width, height: stageSize.height }}>
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              style={{
                cursor: currentTool === 'select' ? 'default' : 'crosshair',
              }}
            >
              {/* Background layer with image */}
              <Layer>
                <KonvaImage
                  image={image}
                  width={stageSize.width}
                  height={stageSize.height}
                  listening={false}
                />
                {/* Invisible rect to capture clicks on the whole canvas */}
                <Rect
                  x={0}
                  y={0}
                  width={stageSize.width}
                  height={stageSize.height}
                  fill="transparent"
                  listening={true}
                />
              </Layer>

              {/* Annotations layer */}
              <Layer>
                {shapes.map(renderShape)}
                {currentShape && renderShape(currentShape)}
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    // Limit resize
                    if (newBox.width < 5 || newBox.height < 5) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>

            {/* Text input - Desktop: floating overlay, Mobile: Dialog */}
            {textInputVisible && !isMobile && (
              <div
                className="absolute z-10"
                style={{
                  left: textInputPosition.x,
                  top: textInputPosition.y,
                }}
              >
                <Input
                  ref={textInputRef}
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onBlur={handleTextSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTextSubmit();
                    }
                    if (e.key === 'Escape') {
                      setTextInputVisible(false);
                      setTextInputValue('');
                    }
                  }}
                  className="min-w-[100px]"
                  style={{
                    color: strokeColor,
                    fontSize: `${fontSize}px`,
                  }}
                  placeholder="Type text..."
                  autoFocus
                />
              </div>
            )}

            {/* Mobile Text Input Dialog */}
            {isMobile && (
              <Dialog open={textInputVisible} onOpenChange={(open) => {
                if (!open) {
                  setTextInputVisible(false);
                  setTextInputValue('');
                }
              }}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Text</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Text</Label>
                      <Input
                        value={textInputValue}
                        onChange={(e) => setTextInputValue(e.target.value)}
                        placeholder="Enter your text..."
                        autoFocus
                        style={{
                          color: strokeColor,
                          fontSize: `${Math.min(fontSize, 24)}px`, // Cap preview size for usability
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && textInputValue.trim()) {
                            handleTextSubmit();
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="grid grid-cols-8 gap-2">
                        {colorPresets.map((color) => (
                          <button
                            key={color}
                            className={`h-8 w-8 rounded border-2 transition-transform hover:scale-110 ${
                              strokeColor === color ? 'border-primary ring-2 ring-primary/50' : color === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setStrokeColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Size: {fontSize}px</Label>
                      <Slider
                        value={[fontSize]}
                        onValueChange={([value]) => setFontSize(value)}
                        min={12}
                        max={72}
                        step={2}
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTextInputVisible(false);
                        setTextInputValue('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleTextSubmit}
                      disabled={!textInputValue.trim()}
                    >
                      Add Text
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Utility function to export stage as base64
export function exportStageToBase64(stage: Konva.Stage | null): string | null {
  if (!stage) return null;

  return stage.toDataURL({
    pixelRatio: 2, // Higher quality export
    mimeType: 'image/png',
  });
}

