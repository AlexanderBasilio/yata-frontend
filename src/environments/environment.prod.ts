export const environment = {
  production: true,
  apiUrl: 'https://restaurants-service-production.up.railway.app', // Fallback for other services
  restaurantServiceUrl: 'https://restaurants-service-production.up.railway.app', // Restaurant/Food specific  
  platformUrl: 'https://zisify-platform-production.up.railway.app', // Platform (Auth, User, Customer, Driver, Partner profiles)
  liquorServiceUrl: 'https://api.yata-delivery.com', // Placeholder or old URL for liquors
  googleAnalyticsId: 'G-LHM0T0C63D',
  mapbox: {
    accessToken: 'pk.eyJ1IjoieWF0YS10ZWNoLXNlcnZpY2VzIiwiYSI6ImNtcHlwaHNlNzA5bDUycW9qYmZ0OHc5ZGEifQ.RMWQY1E-kY9pwrMb-L4yiw' // Pega tu token aquí
  }
};
