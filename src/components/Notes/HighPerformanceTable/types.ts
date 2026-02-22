export type ColumnType = 'text' | 'number' | 'date' | 'status' | 'risk' | 'currency';

export interface StatusOption {
  id: string;
  label: string;
  color: string; // hex color
}

export interface ColumnDefinition {
  id: string;
  label: string;
  type: ColumnType;
  width: number;
  options?: StatusOption[]; // for status type
  align?: 'left' | 'center' | 'right';
}

export interface TableRow {
  id: string;
  type: 'stream' | 'task';
  isExpanded: boolean;
  data: Record<string, any>;
  children?: TableRow[];
}
