export const environment = {
  production: true,
  orderServiceUrl: 'https://api.yata-delivery.com', // ← URL del backend en Render
  apiUrl: 'https://catalog-service-fly.fly.dev',
  restaurantServiceUrl: 'https://restaurant-app-microservices-production.up.railway.app', // ← URL del restaurant service en Railway
  googleAnalyticsId: 'G-LHM0T0C63D',
  mapbox: {
    accessToken: 'pk.eyJ1IjoieWF0YS10ZWNoLXNlcnZpY2VzIiwiYSI6ImNtaG0zcmtwMjF4Mm8yaXByYThoY2g3czUifQ.KwPaG2SmyGdElewCvyVJjA' // ← El mismo token funciona en prod
  }
};
