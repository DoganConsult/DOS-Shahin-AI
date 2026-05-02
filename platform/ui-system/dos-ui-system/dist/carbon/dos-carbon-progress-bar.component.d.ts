/**
 * Carbon-backed determinate / indeterminate progress bar.
 */
export declare class DosCarbonProgressBarComponent {
    label: string;
    helperText: string;
    value: number;
    max: number;
    type: 'default' | 'inline' | 'indented';
    size: 'small' | 'big';
    status: 'active' | 'finished' | 'error';
    hideLabel: boolean;
}
