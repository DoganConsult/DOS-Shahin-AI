import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-comment-activity',
    imports: [CommonModule],
    template: `
    <div class="comment-activity-widget">
      <div class="activity-item" *ngFor="let item of activities">
        <span class="user">{{ item.user }}</span>
        <span class="action">{{ item.action }}</span>
        <span class="time">{{ item.time }}</span>
      </div>
    </div>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class CommentActivityComponent implements OnInit {
  activities: { user: string; action: string; time: string }[] = [];

  ngOnInit(): void {
    this.activities = [
      { user: 'Admin', action: 'commented on Risk-42', time: '2m ago' },
      { user: 'Auditor', action: 'approved Evidence-18', time: '5m ago' },
    ];
  }

}
