import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color?: string;
  allDay?: boolean;
  extendedProps?: Record<string, unknown>;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-calendar-view',
    imports: [CommonModule],
    template: `<div #calendarEl class="calendar-container"></div>`,
    styles: [`
    .calendar-container { width: 100%; min-height: 500px; }
    :host .fc { font-family: var(--font-family, 'IBM Plex Sans', sans-serif); }
  `]
})
export class CalendarViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('calendarEl', { static: true }) calendarEl!: ElementRef<HTMLDivElement>;
  @Input() events: CalendarEvent[] = [];
  @Input() initialView = 'dayGridMonth';
  @Input() locale = 'ar';
  @Input() direction: 'rtl' | 'ltr' = 'rtl';
  @Output() eventClicked = new EventEmitter<CalendarEvent>();
  @Output() dateSelected = new EventEmitter<{ start: Date; end: Date }>();

  private calendar: any = null;

  async ngAfterViewInit(): Promise<void> {
    await this.initCalendar();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['events'] && this.calendar) {
      this.calendar.removeAllEvents();
      this.calendar.addEventSource(this.events);
    }
  }

  ngOnDestroy(): void {
    this.calendar?.destroy();
  }

  private async initCalendar(): Promise<void> {
    try {
      const { Calendar } = await import('@fullcalendar/core');
      const dayGridPlugin = (await import('@fullcalendar/daygrid')).default;
      const timeGridPlugin = (await import('@fullcalendar/timegrid')).default;
      const interactionPlugin = (await import('@fullcalendar/interaction')).default;

      this.calendar = new Calendar(this.calendarEl.nativeElement, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: this.initialView,
        locale: this.locale,
        direction: this.direction,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        },
        events: this.events,
        selectable: true,
        editable: false,
        eventClick: (info: any) => {
          this.eventClicked.emit({
            id: info.event.id,
            title: info.event.title,
            start: info.event.startStr,
            end: info.event.endStr,
            extendedProps: info.event.extendedProps,
          });
        },
        select: (info: any) => {
          this.dateSelected.emit({ start: info.start, end: info.end });
        },
      });

      this.calendar.render();
    } catch (err) {
      console.error('[CalendarView] Init failed:', err);
    }
  }
}
