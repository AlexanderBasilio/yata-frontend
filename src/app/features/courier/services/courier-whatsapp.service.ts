import { Injectable } from '@angular/core';
import { COURIER_CONFIG } from '../config/courier.config';
import { CourierQuoteFormState } from '../models/courier.model';

@Injectable({
  providedIn: 'root'
})
export class CourierWhatsappService {
  readonly whatsappNumber = COURIER_CONFIG.whatsappNumber;

  /**
   * Genera el texto estructurado del mensaje para WhatsApp a partir del estado del formulario.
   */
  buildMessage(state: CourierQuoteFormState): string {
    const serviceMeta = COURIER_CONFIG.serviceTypes.find(s => s.id === state.serviceType);
    const sizeMeta = COURIER_CONFIG.packageSizes.find(s => s.id === state.packageSpecs.size);

    const serviceTitle = serviceMeta?.title || state.serviceType;
    const sizeTitle = sizeMeta?.title || state.packageSpecs.size;

    // Enlaces de mapa para conductor
    const pickupMapLink = state.pickup.isConfirmedOnMap && state.pickup.latitude && state.pickup.longitude
      ? `https://maps.google.com/?q=${state.pickup.latitude.toFixed(6)},${state.pickup.longitude.toFixed(6)}`
      : 'Ubicación ingresada manualmente (por validar en balanza/ruta)';

    const deliveryMapLink = state.delivery.isConfirmedOnMap && state.delivery.latitude && state.delivery.longitude
      ? `https://maps.google.com/?q=${state.delivery.latitude.toFixed(6)},${state.delivery.longitude.toFixed(6)}`
      : 'Ubicación ingresada manualmente (por validar)';

    // Formato de peso
    const weightStr = state.packageSpecs.approxWeightKg !== null && state.packageSpecs.approxWeightKg !== undefined
      ? `~${state.packageSpecs.approxWeightKg} kg`
      : 'No especificado (estándar)';

    // Formato de medidas si aplica
    let dimensionsStr = '';
    if (state.packageSpecs.hasCustomDimensions && state.packageSpecs.lengthCm && state.packageSpecs.widthCm && state.packageSpecs.heightCm) {
      dimensionsStr = `\nMedidas: ${state.packageSpecs.lengthCm} × ${state.packageSpecs.widthCm} × ${state.packageSpecs.heightCm} cm`;
    }

    // Detalles condicionales según tipo de servicio
    let serviceConditionNotes = '';
    if (state.serviceType === 'PURCHASE_PICKUP') {
      const paidStatus = state.packageSpecs.isPurchaseAlreadyPaid ? 'Sí, 100% pagado' : 'No pagado / Requiere coordinación';
      serviceConditionNotes = `\nEstado de compra: ${paidStatus}`;
      if (state.packageSpecs.purchaseCoordinationNotes?.trim()) {
        serviceConditionNotes += `\nNota compra: ${state.packageSpecs.purchaseCoordinationNotes.trim()}`;
      }
    } else if (state.serviceType === 'FRESH_FOOD') {
      const refrigStatus = state.packageSpecs.needsRefrigeration ? 'Sí, requiere frío' : 'No indispensable';
      const containerStatus = state.packageSpecs.hasAdequateContainer ? 'Sí cuenta con recipiente/térmico' : 'No cuenta con recipiente térmico';
      serviceConditionNotes = `\nRefrigeración: ${refrigStatus}\nRecipiente térmico: ${containerStatus}`;
    } else if (state.serviceType === 'OTHER' && state.serviceTypeDetail?.trim()) {
      serviceConditionNotes = `\nDetalle adicional: ${state.serviceTypeDetail.trim()}`;
    }

    // Fragilidad
    const fragileStr = state.packageSpecs.isFragile
      ? `Sí, requiere cuidado especial (${state.packageSpecs.fragilityDetail || 'Contenido delicado'})`
      : 'No es frágil';

    // Riesgo de derrame
    const leakStr = state.packageSpecs.canLeak ? 'Sí, riesgo de líquido/derrame' : 'No';

    // Refrigeración general
    const refrigGeneralStr = state.packageSpecs.needsRefrigeration ? 'Sí' : 'No';

    // Estado de programación de la ruta
    const lateBookingNotice = state.schedule.isLateBooking
      ? ' (Solicitud con ruta del día en curso - Sujeta a evaluación manual de desvío Este-Oeste)'
      : ' (Reserva anticipada)';

    return [
      '📦 *SOLICITUD DE COURIER | ZISIFY*',
      '',
      `*Tipo de servicio:* ${serviceTitle}${serviceConditionNotes}`,
      '',
      '📍 *RECOJO*',
      `Dirección: ${state.pickup.address || 'Por confirmar'}`,
      `Referencia: ${state.pickup.reference || 'Sin referencia'}`,
      `Mapa: ${pickupMapLink}`,
      `Contacto: ${state.contacts.senderName || 'No indicado'} (${state.contacts.senderPhone || 'Sin teléfono'})`,
      '',
      '🎯 *ENTREGA*',
      `Dirección: ${state.delivery.address || 'Por confirmar'}`,
      `Referencia: ${state.delivery.reference || 'Sin referencia'}`,
      `Mapa: ${deliveryMapLink}`,
      `Contacto: ${state.contacts.recipientName || 'No indicado'} (${state.contacts.recipientPhone || 'Sin teléfono'})`,
      '',
      '📦 *PAQUETE*',
      `Tamaño: ${sizeTitle}`,
      `Cantidad: ${state.packageSpecs.quantity} bulto(s)`,
      `Peso aproximado: ${weightStr}${dimensionsStr}`,
      `Fragilidad: ${fragileStr}`,
      `Derrames/filtraciones: ${leakStr}`,
      `Refrigeración: ${refrigGeneralStr}`,
      `Descripción: ${state.packageSpecs.description || 'Sin descripción adicional'}`,
      ...(state.contacts.notes?.trim() ? [`Indicaciones adicionales: ${state.contacts.notes.trim()}`] : []),
      '',
      '🗓️ *PROGRAMACIÓN*',
      `Fecha: ${state.schedule.dateLabel || state.schedule.date}${lateBookingNotice}`,
      `Ventana solicitada: ${COURIER_CONFIG.collectionWindow}`,
      '',
      '⚠️ *IMPORTANTE*',
      'Solicito una cotización. Entiendo que la tarifa, la disponibilidad y la aceptación del servicio deben ser confirmadas por Zisify vía este chat.'
    ].join('\n');
  }

  /**
   * Genera el enlace oficial de wa.me codificado.
   */
  buildWhatsappUrl(state: CourierQuoteFormState): string {
    const message = this.buildMessage(state);
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${this.whatsappNumber}?text=${encoded}`;
  }

  /**
   * Abre WhatsApp en una nueva pestaña/aplicación de forma segura.
   * Maneja restricciones de popups con fallback suave.
   */
  openWhatsapp(state: CourierQuoteFormState): void {
    const url = this.buildWhatsappUrl(state);
    if (typeof window !== 'undefined') {
      const newTab = window.open(url, '_blank');
      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        window.location.href = url;
      }
    }
  }
}
