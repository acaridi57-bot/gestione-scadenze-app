/**
 * Client-side image compression utility
 * Automatically compresses images to 512x512 max, < 200KB target
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number;
  outputFormat?: 'image/webp' | 'image/jpeg';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.75,
  targetSizeKB: 200,
  outputFormat: 'image/webp',
};

/**
 * Compresses an image file with automatic quality adjustment
 * @param file - The input image file
 * @param options - Compression options
 * @returns Compressed image as Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Il file deve essere un\'immagine');
  }

  // Create image element
  const img = await createImageFromFile(file);
  
  // Calculate dimensions maintaining aspect ratio with 1:1 crop
  const { width, height, offsetX, offsetY } = calculateCropDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth!,
    opts.maxHeight!
  );

  // Create canvas for compression
  const canvas = document.createElement('canvas');
  canvas.width = opts.maxWidth!;
  canvas.height = opts.maxHeight!;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossibile creare il contesto canvas');
  }

  // Fill with white background (for transparent PNGs)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw cropped and resized image
  ctx.drawImage(
    img,
    offsetX, offsetY, width, height, // Source (crop area)
    0, 0, opts.maxWidth!, opts.maxHeight! // Destination (full canvas)
  );

  // Compress with quality adjustment to meet target size
  let quality = opts.quality!;
  let blob = await canvasToBlob(canvas, opts.outputFormat!, quality);
  
  // Reduce quality if file is too large
  const targetBytes = opts.targetSizeKB! * 1024;
  while (blob.size > targetBytes && quality > 0.3) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, opts.outputFormat!, quality);
  }

  // If still too large with WebP, try JPEG
  if (blob.size > targetBytes && opts.outputFormat === 'image/webp') {
    quality = 0.7;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    
    while (blob.size > targetBytes && quality > 0.3) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }
  }

  console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB -> ${(blob.size / 1024).toFixed(1)}KB`);
  
  return blob;
}

/**
 * Creates an HTMLImageElement from a File
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Impossibile caricare l\'immagine'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculates crop dimensions for 1:1 aspect ratio
 */
function calculateCropDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; offsetX: number; offsetY: number } {
  // Take the smaller dimension to create a square crop
  const size = Math.min(srcWidth, srcHeight);
  
  // Center the crop
  const offsetX = (srcWidth - size) / 2;
  const offsetY = (srcHeight - size) / 2;

  return {
    width: size,
    height: size,
    offsetX,
    offsetY,
  };
}

/**
 * Converts canvas to Blob with specified format and quality
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Impossibile creare il blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Gets file extension for the output format
 */
export function getExtensionForFormat(format: string): string {
  switch (format) {
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    default:
      return 'webp';
  }
}
