import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss'
})
export class LandingComponent {
    // Cloudinary logo URL — replace with your actual URL when ready
    readonly logoUrl = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1781978350/zisify-logo-red.png';

    stats = [
        { value: '+1k', label: 'Clientes activos' },
        { value: '30 min', label: 'Entrega promedio' },
        { value: '+20 ★', label: 'Restaurantes' },
    ];

    features = [
        {
            icon: '🛵',
            title: 'Entrega ultrarrápida',
            desc: 'Recibes tu pedido en tiempo récord, con seguimiento en tiempo real.',
            highlight: false,
        },
        {
            icon: '⭐',
            title: 'Gana puntos que valen',
            desc: 'Cada pedido suma Inti Points. Canjéalos por descuentos y beneficios reales.',
            highlight: true,
        },
        {
            icon: '🏆',
            title: 'Múltiples categorías',
            desc: 'Comida, licores, mercado y más — todo en una sola app, donde estés.',
            highlight: false,
        },
        {
            icon: '🎮',
            title: 'Avatar que te sube de nivel',
            desc: 'Evoluciona tu personaje con cada pedido. Hay 5 niveles épicos que conquistar.',
            highlight: false,
        },
        {
            icon: '🚀',
            title: 'Regala un delivery',
            desc: 'Envíale una sorpresa a quien quieras. Selecciona dirección y paga desde Maps.',
            highlight: false,
        },
        {
            icon: '📊',
            title: 'Perfil con analítica',
            desc: 'Conoce tus hábitos, pedidos favoritos y cuánto has ahorrado con Zisify.',
            highlight: false,
        },
    ];

    levels = [
        { name: 'Hatun Runa', range: '0–9k pts', icon: '🏓', active: false },
        { name: 'Sapa Inca', range: '10–20k pts', icon: '☀️', active: true },
        { name: 'Nova', range: '20–50k pts', icon: '🌟', active: false },
        { name: 'Inti Mismo', range: '50k+ pts', icon: '✨', active: false },
    ];
}
