export interface SheetCellData {
    $t: string;
    type: string;
}

export interface SheetCell {
    row: number;
    col: number;
    $t: string;
    numericValue?: number;
}

export interface SheetEntry {
    gs$cell: SheetCell;
    title: SheetCellData;
    content: SheetCellData;
}

export interface SheetFeed {
    entry: SheetEntry[];
}

export interface ISheetDocument {
    feed: SheetFeed;
}