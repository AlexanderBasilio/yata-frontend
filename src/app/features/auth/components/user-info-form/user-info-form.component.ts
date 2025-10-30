import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-user-info-form',
  imports: [],
  templateUrl: './user-info-form.component.html',
  styleUrl: './user-info-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoFormComponent { }
