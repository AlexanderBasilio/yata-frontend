import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-cart-summary',
  imports: [],
  templateUrl: './cart-summary.component.html',
  styleUrl: './cart-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartSummaryComponent { }
