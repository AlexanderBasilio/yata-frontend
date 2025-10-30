import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-map-view',
  imports: [],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent { }
