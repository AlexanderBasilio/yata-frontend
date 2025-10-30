import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.scss'
})
export class BannerComponent {
  // Inputs con signals
  storeName = input<string>('Qhapaq Drinks');
  storeLogo = input<string>('https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761807332/qhapaq-drinks-logo_prsrdf.jpg');
  bannerImage = input<string>('https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761806943/banner-1st-store-_1__uoeg1n.webp');

  // Eventos para navegación de banners (futuro)
  onPreviousBanner() {
    console.log('Previous banner clicked');
  }

  onNextBanner() {
    console.log('Next banner clicked');
  }
}
