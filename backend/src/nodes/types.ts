// Graph Engineering Types & Shared State Schema

export type IngestionSource = 'QR_DROP' | 'HOT_FOLDER' | 'MANUAL_UI';
export type JobStatus = 'UPLOADED' | 'IN_LAYOUT' | 'READY_TO_PRINT' | 'PRINTING' | 'COMPLETED' | 'CANCELLED';
export type PaperSize = '4R' | 'A4' | 'Letter' | 'Legal';
export type PaperType = 'GLOSSY_PHOTO' | 'MATTE_PHOTO' | 'PLAIN_PAPER';
export type PresetId = 'SET_1_RUSH' | 'SET_2_2X2' | 'SET_3_COMBO' | 'SET_4_PASSPORT' | 'POLAROID' | 'FREE';

export interface PhotoBoundingBox {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  label?: string;
}

export interface SharedPrintJobState {
  jobId: string;
  createdAt: string;
  source: IngestionSource;
  customer: {
    name?: string;
    phone?: string;
  };
  inputFiles: Array<{
    fileId: string;
    originalName: string;
    mimeType: string;
    filePath: string;
    widthPx?: number;
    heightPx?: number;
    dpi?: number;
  }>;
  product: {
    productId: string;
    name: string;
    category: string;
    paperSize: PaperSize;
    paperType: PaperType;
    isDuplex: boolean;
  };
  layout: {
    presetId: PresetId;
    copies: number;
    showCutLines: boolean;
    zeroGap: boolean;
    mirrorFlip: boolean;
    cropTransform: {
      scale: number;
      offsetX: number;
      offsetY: number;
    };
    boxes: PhotoBoundingBox[];
  };
  costing: {
    materialCost: number;
    operationCost: number;
    laborCost: number;
    totalBaseCost: number;
    targetMarginPercent: number;
    calculatedPrice: number;
    discount: number;
    finalPrice: number;
  };
  preflightVerdict: {
    passed: boolean;
    warnings: string[];
    errors: string[];
    generatedPdfPath?: string;
    generatedPdfSize?: number;
  };
  hardwareState: {
    printerReady: boolean;
    inkStatus: 'OK' | 'LOW' | 'EMPTY';
    paperStatus: 'LOADED' | 'EMPTY';
    cupsJobId?: number;
  };
  payment: {
    status: 'PENDING' | 'PAID';
    cashTendered: number;
    changeDue: number;
    paymentMethod: 'CASH' | 'GCASH';
  };
}

export interface GraphNode<TInput, TOutput> {
  name: string;
  execute(input: TInput): Promise<TOutput>;
}
