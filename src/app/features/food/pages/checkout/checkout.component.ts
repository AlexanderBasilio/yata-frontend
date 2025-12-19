import { Component, OnInit, ElementRef, ViewChild, inject, OnDestroy, NgZone, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import mapboxgl from 'mapbox-gl';
import { environment } from '../../../../../environments/environment';
import { FoodOrderService } from '../../../../core/services/food-order/food-order.service';
import {
    CheckoutRequest,
    LocationRequest,
    PaymentMethod,
    OrderSummaryResponse,
    SummaryRequest,
    OrderResponse
} from '../../../../core/models/food-order.model';

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
    @ViewChild('mapElement') mapElement!: ElementRef;

    private fb = inject(FormBuilder);
    private router = inject(Router);
    private orderService = inject(FoodOrderService);
    private ngZone = inject(NgZone);
    private cdr = inject(ChangeDetectorRef);

    // Signals
    clientName = signal<string>('');
    greetingMessage = computed(() => `GRACIAS POR TU COMPRA, ${(this.clientName() || 'CLIENTE').toUpperCase()}`);

    // Pasos del Wizard
    currentStep = 1;

    // Formularios
    locationForm: FormGroup;
    detailsForm: FormGroup;

    // Mapa
    map!: mapboxgl.Map;
    marker!: mapboxgl.Marker;
    initialLat = -12.06513; // Huancayo por defecto
    initialLng = -75.20486;

    // Estado
    cartId: string | null = null;
    orderSummary: OrderSummaryResponse | null = null;
    confirmedOrder: OrderResponse | null = null; // Para mostrar el código en paso 3
    isLoadingSummary = false;
    isProcessingOrder = false;
    copied = false; // Estado para feedback de copiado

    // Opciones de pago
    paymentMethods = Object.values(PaymentMethod);
    selectedPaymentMethod = PaymentMethod.MANUAL_TRANSFER;

    constructor() {
        this.cartId = localStorage.getItem('yata_cart_id');

        // 1. Formulario de Ubicación
        this.locationForm = this.fb.group({
            address: ['', [Validators.required, Validators.minLength(5)]],
            reference: [''],
            latitude: [null, Validators.required],
            longitude: [null, Validators.required],
            city: [''],
            region: ['']
        });

        // 2. Formulario de Detalles Personales y Pago
        this.detailsForm = this.fb.group({
            clientName: ['', [Validators.required, Validators.minLength(2)]],
            clientPhoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
            deliveryInstructions: [''],
            isOver18: [false, Validators.requiredTrue],
            paymentMethod: [PaymentMethod.MANUAL_TRANSFER, Validators.required]
        });

        // Actualizar signal de nombre cuando cambie el input
        this.detailsForm.get('clientName')?.valueChanges.subscribe(val => {
            this.clientName.set(val);
        });
    }

    ngOnInit(): void {
        // Recuperar estado de pedido confirmado si existe (para persistencia)
        const savedOrder = localStorage.getItem('yata_confirmed_order');
        if (savedOrder) {
            this.confirmedOrder = JSON.parse(savedOrder);
            if (this.confirmedOrder) {
                this.clientName.set(this.confirmedOrder.clientName);
                this.currentStep = 3;
                return; // Si hay pedido confirmado, saltamos validaciones de carrito
            }
        }

        if (!this.cartId) {
            alert('No hay un carrito activo');
            this.router.navigate(['/food/catalog']);
        }
    }

    ngAfterViewInit() {
        // Solo inicializamos el mapa si estamos en el paso 1
        if (this.currentStep === 1) {
            this.initializeMap();
        }
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
        }
    }

    // --- MAPBOX LOGIC ---
    initializeMap() {
        if (environment.mapbox.accessToken) {
            (mapboxgl as any).accessToken = environment.mapbox.accessToken;
        }

        setTimeout(() => {
            if (!this.mapElement) return;

            this.map = new mapboxgl.Map({
                container: this.mapElement.nativeElement,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [this.initialLng, this.initialLat],
                zoom: 13
            });

            this.map.addControl(new mapboxgl.NavigationControl());
            this.map.addControl(new mapboxgl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true
            }));

            this.marker = new mapboxgl.Marker({ draggable: true, color: '#ff4081' })
                .setLngLat([this.initialLng, this.initialLat])
                .addTo(this.map);

            // Evento mientras se arrastra (actualización en tiempo real)
            this.marker.on('drag', () => {
                const lngLat = this.marker.getLngLat();
                this.ngZone.run(() => {
                    this.updateLocationForm(lngLat.lat, lngLat.lng);
                    this.cdr.detectChanges(); // Forzamos actualización visual
                });
            });

            // Evento al soltar
            this.marker.on('dragend', () => {
                const lngLat = this.marker.getLngLat();
                this.ngZone.run(() => {
                    this.updateLocationForm(lngLat.lat, lngLat.lng);
                    this.reverseGeocode(lngLat.lat, lngLat.lng);
                    this.cdr.detectChanges();
                });
            });

            this.map.on('click', (e) => {
                this.marker.setLngLat(e.lngLat);
                this.ngZone.run(() => {
                    this.updateLocationForm(e.lngLat.lat, e.lngLat.lng);
                    this.reverseGeocode(e.lngLat.lat, e.lngLat.lng);
                    this.cdr.detectChanges();
                });
            });

            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                this.flyToLocation(latitude, longitude);
            });
        }, 100);
    }

    // Método para buscar dirección con API de Mapbox
    async searchAddress() {
        const query = this.locationForm.get('address')?.value;
        if (!query || query.length < 3) return;

        try {
            const accessToken = environment.mapbox.accessToken;
            // Centro por defecto o el del mapa si existe
            const center = this.map ? this.map.getCenter() : { lng: -77.0428, lat: -12.0464 };

            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&country=pe&proximity=${center.lng},${center.lat}&types=address,poi,place&limit=1`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                const [lng, lat] = feature.center;

                // Extraer ciudad y región del contexto
                const { city, region } = this.extractCityAndRegion(feature.context || []);

                this.ngZone.run(() => {
                    this.locationForm.patchValue({ city, region });
                });

                this.flyToLocation(lat, lng);
            } else {
                console.warn('No se encontraron resultados para la dirección');
                alert('No encontramos esa dirección. Intenta ser más específico.');
            }
        } catch (error) {
            console.error('Error buscando dirección:', error);
        }
    }

    // Obtener dirección textual (y ciudad/region) a partir de coordenadas tras mover el PIN
    async reverseGeocode(lat: number, lng: number) {
        try {
            const accessToken = environment.mapbox.accessToken;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}&country=pe&types=address,poi,place,locality`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                // Actualizamos el campo de texto con la dirección encontrada
                const address = feature.place_name;
                const { city, region } = this.extractCityAndRegion(feature.context || []);

                this.ngZone.run(() => {
                    // Actualizamos address, city y region
                    this.locationForm.patchValue({ address, city, region });
                    this.cdr.detectChanges();
                });
            }
        } catch (error) {
            console.error('Error en reverse geocoding:', error);
        }
    }

    // Helper para parsear el contexto de Mapbox
    extractCityAndRegion(context: any[]): { city: string, region: string } {
        // Valores por defecto
        let city = 'Huancayo';
        let region = 'Junin';

        // Mapbox context devuelve array de objetos con "id". 
        // Ejemplo: id: "place.123" -> Ciudad/Distrito, id: "region.456" -> Departamento

        const place = context.find(c => c.id.startsWith('place'));
        if (place) city = place.text;

        const reg = context.find(c => c.id.startsWith('region'));
        if (reg) region = reg.text;

        return { city, region };
    }

    flyToLocation(lat: number, lng: number) {
        this.map.flyTo({ center: [lng, lat], zoom: 16 });
        this.marker.setLngLat([lng, lat]);
        this.ngZone.run(() => {
            this.updateLocationForm(lat, lng);
            this.cdr.detectChanges();
        });

        // Ejecutamos reverse geocoding para asegurar que tengamos la ciudad correcta
        // incluso si venimos de geolocalización o flyTo manual
        this.reverseGeocode(lat, lng);
    }

    updateLocationForm(lat: number, lng: number) {
        this.locationForm.patchValue({ latitude: lat, longitude: lng });
    }

    // --- NAVEGACIÓN ENTRE PASOS ---

    // Paso 1 -> Paso 2
    goToStep2() {
        if (this.locationForm.invalid) return;
        this.isLoadingSummary = true;
        this.calculateSummary();
    }

    // Volver al Paso 1
    goToStep1() {
        this.currentStep = 1;
        setTimeout(() => this.initializeMap(), 100);
    }

    calculateSummary() {
        const loc = this.locationForm.value;
        const locationReq: LocationRequest = {
            address: loc.address + (loc.reference ? ` (${loc.reference})` : ''),
            latitude: Number(loc.latitude.toFixed(8)),
            longitude: Number(loc.longitude.toFixed(8)),
            city: loc.city || 'Huancayo',
            region: loc.region || 'Junin'
        };

        if (!this.cartId) return;

        const request: SummaryRequest = {
            cartId: this.cartId,
            location: locationReq // Usamos 'location' como vimos en el DTO
        };

        console.log('🚀 Enviando solicitud de resumen:', JSON.stringify(request, null, 2));

        this.orderService.calculateSummary(request).subscribe({
            next: (res) => {
                console.log('✅ Resumen recibido:', res); // Log de éxito
                this.orderSummary = res;
                this.currentStep = 2; // Actualizamos el paso primero
                this.isLoadingSummary = false;
                this.cdr.detectChanges(); // Forzamos actualización de la vista
            },
            error: (err) => {
                console.error('❌ Error calculando resumen:', err);
                if (err.error) {
                    console.error('📦 Detalle del error:', JSON.stringify(err.error, null, 2));
                    alert(`Error: ${err.error.message || 'Datos inválidos'}`);
                } else {
                    alert('Error al calcular costos de envío. Revisa tu conexión.');
                }
                this.isLoadingSummary = false;
            }
        });
    }

    confirmOrder() {
        if (this.detailsForm.invalid || !this.locationForm.valid || !this.cartId) {
            this.detailsForm.markAllAsTouched();
            return;
        }

        this.isProcessingOrder = true;
        const formVal = this.detailsForm.value;
        const locVal = this.locationForm.value;

        const request: CheckoutRequest = {
            cartId: this.cartId,
            clientName: formVal.clientName,
            clientPhoneNumber: formVal.clientPhoneNumber,
            isOver18: formVal.isOver18,
            deliveryInstructions: formVal.deliveryInstructions,
            paymentMethod: formVal.paymentMethod,
            locationRequest: {
                address: locVal.address + (locVal.reference ? ` (${locVal.reference})` : ''),
                latitude: Number(locVal.latitude.toFixed(8)),
                longitude: Number(locVal.longitude.toFixed(8)),
                city: locVal.city || 'Huancayo',
                region: locVal.region || 'Junin'
            }
        };

        this.orderService.confirmOrder(request).subscribe({
            next: (res) => {
                // Éxito: Guardamos en localstorage y pasamos al paso 3
                this.confirmedOrder = res;
                localStorage.setItem('yata_confirmed_order', JSON.stringify(res));

                // Limpiamos el carrito local para evitar que se use de nuevo
                localStorage.removeItem('yata_cart_id');

                this.isProcessingOrder = false;
                this.currentStep = 3;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error(err);
                alert('Error al crear el pedido.');
                this.isProcessingOrder = false;
            }
        });
    }

    async copyCode() {
        if (!this.confirmedOrder) return;
        try {
            await navigator.clipboard.writeText(this.confirmedOrder.orderCode);
            this.copied = true;
            setTimeout(() => {
                this.copied = false;
                this.cdr.detectChanges();
            }, 2000);
            this.cdr.detectChanges();
        } catch (err) {
            console.error('Error al copiar:', err);
            alert('No se pudo copiar al portapapeles');
        }
    }

    goHome() {
        // Limpiamos la orden guardada al salir explícitamente, para permitir nuevas compras
        localStorage.removeItem('yata_confirmed_order');
        this.router.navigate(['/food']);
    }
}