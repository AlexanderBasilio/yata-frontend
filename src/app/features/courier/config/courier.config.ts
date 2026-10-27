import { CourierPackageSize, CourierServiceType } from '../models/courier.model';

export const COURIER_CONFIG = {
  /**
   * Ruta privada y no anunciada para el MVP de Courier.
   * Cadena de 12 caracteres alfanumérica, opaca y no adivinable.
   */
  routePath: 'c/x8q2m9k4v7rp',

  /**
   * Número oficial de WhatsApp de Zisify para recepción de cotizaciones de Courier.
   * Formato internacional E.164 sin signo '+', sin espacios ni guiones:
   * Código de país (51) + 9 dígitos de celular en Perú.
   */
  whatsappNumber: '51993861207',

  /**
   * Ventana operativa oficial de recolección programada.
   */
  collectionWindow: '10:00 a. m. a 12:00 p. m.',

  /**
   * Hora límite para cierre de reservas anticipadas de la ruta del día.
   */
  cutoffHour: 9,
  cutoffMinute: 45,
  cutoffTimeLabel: '9:45 a. m.',

  /**
   * Tiempo máximo de espera del conductor en el punto de recojo.
   */
  maxWaitTimeMinutes: 10,

  /**
   * Centro por defecto para el mapa de Mapbox (Lima Metropolitana / Lima Este).
   */
  defaultMapCenter: [-76.876778, -12.003528] as [number, number],
  defaultZoom: 14,

  /**
   * Tipos de servicio disponibles con iconografía y descripciones.
   */
  serviceTypes: [
    {
      id: 'PACKAGE' as CourierServiceType,
      title: 'Paquete o encomienda',
      description: 'Cajas, sobres, prendas, artículos personales o mercadería.',
      icon: '📦',
      badge: 'Estándar'
    },
    {
      id: 'PURCHASE_PICKUP' as CourierServiceType,
      title: 'Recojo de compra ya realizada',
      description: 'Productos ya pagados en tiendas, almacenes o locales comerciales.',
      icon: '🛍️',
      badge: 'Coordinado'
    },
    {
      id: 'FRESH_FOOD' as CourierServiceType,
      title: 'Productos frescos o perecibles',
      description: 'Pescados, mariscos, carnes o alimentos frescos que requieren atención.',
      icon: '🐟',
      badge: 'Cuidado especial'
    },
    {
      id: 'OTHER' as CourierServiceType,
      title: 'Otro tipo de envío',
      description: 'Envíos con requerimientos especiales, sujetos a evaluación previa.',
      icon: '✨',
      badge: 'Sujeto a evaluación'
    }
  ],

  /**
   * Tamaños de paquete estándar.
   */
  packageSizes: [
    {
      id: 'SMALL' as CourierPackageSize,
      title: 'Pequeño',
      description: 'Sobre, bolsa compacta, documentos, llaves o accesorios.',
      icon: '✉️',
      example: 'Hasta ~2 kg'
    },
    {
      id: 'MEDIUM' as CourierPackageSize,
      title: 'Mediano',
      description: 'Caja mediana, mochila o paquete transportable por una persona.',
      icon: '📦',
      example: 'Hasta ~8 kg'
    },
    {
      id: 'LARGE' as CourierPackageSize,
      title: 'Grande o voluminoso',
      description: 'Cajas grandes, paquetes pesados o bultos especiales.',
      icon: '🏷️',
      example: 'Sujeto a cubicaje'
    }
  ]
};
