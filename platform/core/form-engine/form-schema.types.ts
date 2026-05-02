export type FieldType =
  | 'text' | 'textarea' | 'number' | 'email' | 'url' | 'date' | 'datetime'
  | 'boolean' | 'select' | 'multi_select' | 'radio' | 'file_upload'
  | 'rich_text' | 'relation' | 'user_select' | 'section_header';

export type ValidationRule =
  | { type: 'required' }
  | { type: 'min'; value: number }
  | { type: 'max'; value: number }
  | { type: 'minLength'; value: number }
  | { type: 'maxLength'; value: number }
  | { type: 'pattern'; regex: string; message?: string }
  | { type: 'email' }
  | { type: 'url' };

export interface SelectOption {
  value: string;
  label: string;
  labelAr?: string;
  disabled?: boolean;
}

export interface RelationConfig {
  targetEntityType: string;
  endpoint: string;
  displayField: string;
  valueField: string;
  multiple?: boolean;
}

export interface FormField {
  key: string;
  type: FieldType;
  label: string;
  labelAr?: string;
  placeholder?: string;
  placeholderAr?: string;
  description?: string;
  descriptionAr?: string;
  defaultValue?: unknown;
  validations?: ValidationRule[];
  options?: SelectOption[];
  relation?: RelationConfig;
  showWhen?: Record<string, unknown>;
  readonly?: boolean;
  span?: number;
  fields?: FormField[];
}

export interface FormSection {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  fields: FormField[];
}

export interface FormAction {
  id: string;
  label: string;
  labelAr?: string;
  type: 'submit' | 'cancel' | 'draft' | 'custom';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  emitEvent?: string;
}

export interface FormSchema {
  id: string;
  entityType: string;
  version: string;
  title: string;
  titleAr?: string;
  description?: string;
  layout?: 'sections' | 'flat';
  sections?: FormSection[];
  fields?: FormField[];
  actions?: FormAction[];
  disabledWhen?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
