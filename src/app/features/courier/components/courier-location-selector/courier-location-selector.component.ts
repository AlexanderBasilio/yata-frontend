import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  inject,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import mapboxgl from 'mapbox-gl';
import { MapboxService } from '../../../../core/services/location/mapbox.service';
import { CourierLocation } from '../../models/courier.model';
import { COURIER_CONFIG } from '../../config/courier.config';

@Component({
  selector: 'app-courier-location-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './courier-location-selector.component.html',
  styleUrl: './courier-location-selector.component.scss'
})
export class CourierLocationSelectorComponent implements OnInit, AfterViewInit, OnDestroy {
  private mapboxService = inject(MapboxService);

  @Input({ required: true }) sectionTitle = 'Ubicación';
  @Input({ required: true }) sectionSubtitle = 'Selecciona en el mapa o busca la dirección';
  @Input({ required: true }) uniqueId = 'location-map';
  @Input() placeholder = 'Buscar calle, avenida, distrito o local...';
  @Input() referencePlaceholder = 'Ej: Frente a la botica, puerta negra, dpto 302...';
  @Input() icon = '📍';

  @Input() set initialLocation(val: CourierLocation | null | undefined) {
    if (val) {
      this.currentLocation.set({ ...val });
      this.searchQuery.set(val.address || '');
      this.referenceText.set(val.reference || '');
    }
  }

  @Output() locationChange = new EventEmitter<CourierLocation>();

  @ViewChild('mapContainer') mapContainerElement?: ElementRef<HTMLDivElement>;

  // Estado reactivo
  currentLocation = signal<CourierLocation>({
    address: '',
    reference: '',
    latitude: null,
    longitude: null,
    isConfirmedOnMap: false
  });

  searchQuery = signal<string>('');
  referenceText = signal<string>('');
  searchResults = signal<any[]>([]);
  isSearching = signal<boolean>(false);
  isLoadingMap = signal<boolean>(true);
  mapError = signal<string | null>(null);
  isLocating = signal<boolean>(false);

  // Instancias de Mapbox GL
  private map?: mapboxgl.Map;
  private marker?: mapboxgl.Marker;
  private searchDebounceTimer?: any;

  ngOnInit(): void {
    // Si viene con dirección inicial, sincronizar
    if (this.currentLocation().address) {
      this.searchQuery.set(this.currentLocation().address);
      this.referenceText.set(this.currentLocation().reference);
    }
  }

  ngAfterViewInit(): void {
    // Inicializar mapa con retardo breve para asegurar montaje del contenedor
    setTimeout(() => {
      this.initMap();
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    if (this.marker) {
      this.marker.remove();
    }
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  /**
   * Inicializa la instancia de Mapbox
   */
  private initMap(): void {
    try {
      const initialLat = this.currentLocation().latitude;
      const initialLng = this.currentLocation().longitude;

      const center: [number, number] = (initialLat && initialLng)
        ? [initialLng, initialLat]
        : COURIER_CONFIG.defaultMapCenter;

      this.map = this.mapboxService.createMap(
        this.uniqueId,
        center,
        (initialLat && initialLng) ? 15 : COURIER_CONFIG.defaultZoom
      );

      this.map.on('load', () => {
        this.isLoadingMap.set(false);
        this.mapError.set(null);

        // Crear marcador arrastrable con color magenta oficial
        this.marker = new mapboxgl.Marker({
          draggable: true,
          color: '#C30364'
        })
          .setLngLat(center)
          .addTo(this.map!);

        // Listener de arrastre del pin
        this.marker.on('dragend', () => {
          const lngLat = this.marker!.getLngLat();
          this.handleCoordinatesSelected(lngLat.lng, lngLat.lat, true);
        });

        // Listener de clic sobre el mapa para reposicionar pin
        this.map!.on('click', (e) => {
          this.marker!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          this.handleCoordinatesSelected(e.lngLat.lng, e.lngLat.lat, true);
        });

        // Añadir controles de navegación sencillos y compactos
        this.map!.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

        // Si ya había coordenadas confirmadas, sincronizar
        if (initialLat && initialLng) {
          this.marker.setLngLat([initialLng, initialLat]);
        }
      });

      this.map.on('error', (e) => {
        console.warn('Advertencia en carga de mapa Mapbox:', e);
        // Si hay fallo grave de WebGL o token, activar modo manual controlado
        if (!this.map?.loaded()) {
          this.isLoadingMap.set(false);
          this.mapError.set('No se pudo inicializar la vista satelital/mapa. Puedes ingresar tu dirección manualmente.');
        }
      });
    } catch (err: any) {
      console.warn('Error al iniciar Mapbox GL:', err);
      this.isLoadingMap.set(false);
      this.mapError.set('Servicio de mapa no disponible temporalmente. Puedes ingresar la dirección de forma manual.');
    }
  }

  /**
   * Entrada de texto para búsqueda de dirección con debounce
   */
  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const trimmed = val.trim();
    if (trimmed.length < 3) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      // Si el usuario borra la búsqueda, marcar como no confirmada en mapa
      if (trimmed.length === 0) {
        this.updateLocationState({
          address: '',
          latitude: null,
          longitude: null,
          isConfirmedOnMap: false
        });
      }
      return;
    }

    this.isSearching.set(true);
    this.searchDebounceTimer = setTimeout(async () => {
      try {
        const results = await this.mapboxService.searchAddress(trimmed);
        this.searchResults.set(results || []);
      } catch (e) {
        this.searchResults.set([]);
      } finally {
        this.isSearching.set(false);
      }
    }, 320);
  }

  /**
   * Selección de una sugerencia del autocompletado
   */
  selectSuggestion(item: any): void {
    const [lng, lat] = item.center;
    const placeName = item.place_name || item.text;

    this.searchQuery.set(placeName);
    this.searchResults.set([]);

    // Mover mapa y marcador
    if (this.map && this.marker) {
      this.map.flyTo({ center: [lng, lat], zoom: 15.5, essential: true });
      this.marker.setLngLat([lng, lat]);
    }

    this.updateLocationState({
      address: placeName,
      placeName: item.text,
      latitude: lat,
      longitude: lng,
      isConfirmedOnMap: true,
      isManualFallback: false
    });
  }

  /**
   * Maneja coordenadas seleccionadas por clic o arrastre
   */
  private async handleCoordinatesSelected(lng: number, lat: number, reverseGeocode: boolean): Promise<void> {
    let resolvedAddress = this.searchQuery().trim();

    if (reverseGeocode) {
      try {
        const result = await this.mapboxService.reverseGeocode(lng, lat);
        if (result && result.address) {
          resolvedAddress = result.address;
          this.searchQuery.set(result.address);
        }
      } catch (err) {
        console.warn('Error en geocodificación inversa:', err);
      }
    }

    this.updateLocationState({
      address: resolvedAddress || `Ubicación GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      latitude: lat,
      longitude: lng,
      isConfirmedOnMap: true,
      isManualFallback: false
    });
  }

  /**
   * Botón voluntario "Usar mi ubicación actual" (activado SOLO por el usuario)
   */
  locateUser(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización automática. Por favor busca tu dirección en el mapa.');
      return;
    }

    this.isLocating.set(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating.set(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (this.map && this.marker) {
          this.map.flyTo({ center: [lng, lat], zoom: 16, essential: true });
          this.marker.setLngLat([lng, lat]);
        }

        this.handleCoordinatesSelected(lng, lat, true);
      },
      (err) => {
        this.isLocating.set(false);
        let msg = 'No pudimos obtener tu ubicación actual.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permiso de ubicación denegado. Puedes escribir tu dirección en el buscador.';
        }
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  /**
   * Actualización del texto de referencia
   */
  onReferenceChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.referenceText.set(val);

    this.updateLocationState({
      reference: val
    });
  }

  /**
   * Entrada manual cuando el mapa no está disponible o el usuario lo prefiere
   */
  onManualAddressInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);

    this.updateLocationState({
      address: val,
      isConfirmedOnMap: false,
      isManualFallback: true
    });
  }

  /**
   * Emite cambios de estado al componente padre
   */
  private updateLocationState(partial: Partial<CourierLocation>): void {
    const updated: CourierLocation = {
      ...this.currentLocation(),
      ...partial,
      reference: this.referenceText().trim()
    };
    this.currentLocation.set(updated);
    this.locationChange.emit(updated);
  }
}
