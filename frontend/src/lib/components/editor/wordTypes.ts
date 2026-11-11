export interface CanvasField {
    id: string;
    type: 'text' | 'logo' | 'table';
    content: string;
    x: number;
    y: number;
    w: number;
    h: number;
    createdAt?: number;
    style: {
        backgroundColor?: string;
        color?: string;
        fontSize?: number;
        fontWeight?: string;
        padding?: number;
        textAlign?: string;
        verticalAlign?: string;
        dynamicHeight?: boolean;
        repeatOnAllPages?: boolean;
    };
    tableConfig?: any;
    imageBase64?: string;
}

export type WordBlockType = 
    | 'paragraph' 
    | 'heading1' 
    | 'heading2' 
    | 'heading3' 
    | 'quote' 
    | 'din5008_header' 
    | 'columns' 
    | 'table' 
    | 'billing_table' 
    | 'logo' 
    | 'page_break'
    | 'divider';

export interface WordBlockStyle {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'line-through';
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
    backgroundColor?: string;
    lineHeight?: number;
    marginTop?: number;
    marginBottom?: number;
    widthPercent?: number; // 20 to 100 %
    boxAlign?: 'left' | 'center' | 'right';
}

export interface WordColumnItem {
    id: string;
    content: string;
    widthPercent?: number; // e.g. 33.33 or 40
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    fontSize?: number;
}

export interface WordColumnsConfig {
    count: number; // 2, 3 or 4
    columns: WordColumnItem[];
    repeatOnAllPages?: boolean;
    borderTop?: boolean;
    selectedColIndex?: number;
    returnAddressFontSize?: number;
}

export interface WordBlock {
    id: string;
    type: WordBlockType;
    content: string;
    style: WordBlockStyle;
    columnsConfig?: WordColumnsConfig;
    tableData?: {
        headers: string[];
        rows: string[][];
    };
    tableConfig?: {
        columns?: Array<{ id: string; name: string; type: string; width: number; align: string }>;
        fontSize?: number;
        headerFontSize?: number;
        showHeaders?: boolean;
        headerBackgroundColor?: string;
        headerTextColor?: string;
        textColor?: string;
        _selectedColIdx?: number;
        borderColor?: string;
        descriptionMode?: 'appointment' | 'appointment_title' | 'appointment_desc' | 'appointment_tasks' | 'static';
        staticDescription?: string;
        includeTimeRecords?: boolean;
        includeDriveKm?: boolean;
        includeDriveLumpSum?: boolean;
        includeExpenditures?: boolean;
        includeTotalNetto?: boolean;
        includeTotalTax?: boolean;
        includeTotalBrutto?: boolean;
        labelNetto?: string;
        labelTax?: string;
        labelBrutto?: string;
        firstPageLimit?: number;
        nextPageLimit?: number;
        borderMode?: 'all' | 'box' | 'none' | 'top' | 'bottom';
        borderWidth?: string;
        isZebra?: boolean;
        zebraColor?: string;
        firstColumnHighlight?: boolean;
        cellPadding?: number;
        repeatHeader?: boolean;
        keepTogether?: boolean;
        textWrap?: string;
        altTitle?: string;
        altDescription?: string;
        includeTotalDuration?: boolean;
        labelDuration?: string;
        showPriceUnits?: boolean;
        showTotalDivider?: boolean;
        dividerScope?: 'full' | 'totals';
        compactTotals?: boolean;
    };
    logoConfig?: {
        url?: string;
        width?: number;
        height?: number;
        align?: 'left' | 'center' | 'right';
        x?: number;
        y?: number;
        isFree?: boolean;
        repeatOnAllPages?: boolean;
        spacing?: number;
        fit?: 'contain' | 'cover';
        imgOffsetX?: number;
        imgOffsetY?: number;
        marginTop?: number;
        marginBottom?: number;
    };
    din5008Config?: {
        returnAddress?: string;
        recipient?: string;
        infoDateBlock?: string;
        subject?: string;
        variant?: 'formA' | 'formB';
        returnAddressFontSize?: number;
        bottomSpacing?: number;
    };
    canvasMeta?: {
        x?: number;
        y?: number;
        w?: number;
        h?: number;
        repeatOnAllPages?: boolean;
    };
}

export interface VariableCategory {
    category: string;
    icon: string;
    items: Array<{
        token: string;
        label: string;
        sample: string;
    }>;
}
