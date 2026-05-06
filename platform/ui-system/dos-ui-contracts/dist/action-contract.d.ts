export type ActionPriority = 'primary' | 'secondary' | 'tertiary' | 'overflow';
export interface ActionContract {
    id: string;
    i18nKey: string;
    icon?: string;
    priority: ActionPriority;
    /** Permission code(s) required to render this action. Dot-style only. */
    permissions?: string[];
    /** Behavior when the viewport is mobile-class. */
    mobile?: 'visible' | 'overflow' | 'hidden';
    destructive?: boolean;
}
