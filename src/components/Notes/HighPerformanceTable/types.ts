export type ColumnType = 'text' | 'date' | 'status' | 'risk';

export interface StatusOption {
    id: string;
    label: string;
    color: string;
}

export interface ColumnDefinition {
    id: string;
    label: string;
    type: ColumnType;
    width: number;
    options?: StatusOption[]; // for status/risk types
}

export interface TableRow {
    id: string;
    type: 'stream' | 'task';
    isExpanded: boolean;
    data: Record<string, any>; // Keyed by column ID. The 'primary' key usually holds the name.
    children?: TableRow[];
}
