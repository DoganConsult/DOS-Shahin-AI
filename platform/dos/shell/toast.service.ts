import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
    severity: 'success' | 'info' | 'warn' | 'error';
    summary: string;
    detail?: string;
    life?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    private _messages = signal<ToastMessage[]>([]);
    readonly messages = this._messages.asReadonly();

    show(msg: ToastMessage): void {
        this._messages.update(list => [...list, msg]);
        const life = msg.life ?? 4000;
        setTimeout(() => this.dismiss(msg), life);
    }

    success(summary: string, detail?: string): void {
        this.show({ severity: 'success', summary, detail });
    }

    error(summary: string, detail?: string): void {
        this.show({ severity: 'error', summary, detail });
    }

    warn(summary: string, detail?: string): void {
        this.show({ severity: 'warn', summary, detail });
    }

    info(summary: string, detail?: string): void {
        this.show({ severity: 'info', summary, detail });
    }

    dismiss(msg: ToastMessage): void {
        this._messages.update(list => list.filter(m => m !== msg));
    }

    clear(): void {
        this._messages.set([]);
    }
}
