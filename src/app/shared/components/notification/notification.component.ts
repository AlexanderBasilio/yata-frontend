import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-notification',
  imports: [],
  template: `<p>notification works!</p>`,
  styleUrl: './notification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent { }
