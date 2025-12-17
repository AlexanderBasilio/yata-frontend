export const environment = {
  production: true,
  orderServiceUrl: 'https://api.yata-delivery.com', // ← URL del backend en Railway
  apiUrl: 'https://catalog-service-fly.fly.dev', // URL del catalogo en Render
  restaurantServiceUrl: 'https://restaurant-app-microservices-production.up.railway.app', // ← URL del restaurant service en Railway
  foodCartServiceUrl: 'https://food-cart-service-production.up.railway.app',
  googleAnalyticsId: 'G-LHM0T0C63D',
  mapbox: {
    accessToken: 'pk.eyJ1IjoieWF0YS10ZWNoLXNlcnZpY2VzIiwiYSI6ImNtaDJ1MWk2MDBobmYybW9mZWZwOGg4cHEifQ.i8C8RnScDWZFaaGAEQy8PACvyVJjA' // ← El mismo token funciona en prod
  }
};
