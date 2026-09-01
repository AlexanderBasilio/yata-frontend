// Only developer-defined action names may be sent. Never use DOM text or form values.
export const UI_ACTIONS = [
  'landing_nav_login', 'landing_nav_register', 'landing_hero_register',
  'landing_hero_login', 'landing_footer_register', 'home_select_service',
  'home_select_restaurant', 'home_select_dish', 'home_open_address',
  'home_promotion_open', 'home_promotion_close', 'catalog_select_restaurant',
  'catalog_filter', 'catalog_open_address', 'restaurant_categories',
  'restaurant_category_select', 'restaurant_category_guide_dismiss', 'restaurant_view_cart', 'restaurant_back',
  'dish_close', 'dish_quantity_decrease', 'dish_quantity_increase', 'dish_add_to_cart',
  'cart_checkout', 'cart_clear', 'cart_remove_item', 'cart_increase_quantity',
  'cart_decrease_quantity', 'cart_cutlery', 'cart_return_restaurant', 'cart_catalog',
  'checkout_search_address', 'checkout_continue', 'checkout_back', 'checkout_confirm_order',
  'payment_close', 'payment_copy_phone', 'payment_audio_step_1', 'payment_audio_step_2',
  'payment_continue', 'payment_back', 'payment_report', 'payment_copy_order_code', 'payment_done',
  'nav_home', 'nav_cart', 'nav_orders', 'nav_wallet', 'nav_profile',
  'login_google', 'login_submit', 'login_register', 'register_google', 'register_submit',
  'register_login', 'auth_modal_google', 'auth_modal_submit', 'auth_modal_switch',
  'auth_modal_close', 'orders_open_payment', 'orders_refresh'
] as const;

const PAGES: Record<string, string> = {
  '/': 'Inicio', '/zisify': 'Landing', '/home': 'Servicios',
  '/auth/login': 'Iniciar sesión', '/auth/register': 'Crear cuenta',
  '/food/catalog': 'Restaurantes', '/food/restaurant/:id': 'Detalle de restaurante',
  '/food/cart': 'Carrito de comidas', '/food/checkout': 'Checkout de comidas',
  '/liquor/catalog': 'Catálogo de licores', '/liquor/cart': 'Carrito de licores',
  '/liquor/location': 'Entrega de licores', '/orders': 'Mis pedidos',
  '/profile': 'Perfil', '/wallet': 'Billetera', '/select-cart': 'Elegir carrito',
  '/privacy': 'Privacidad', '/terms': 'Términos', '/reclamaciones': 'Reclamaciones',
  '/closed': 'Servicio cerrado'
};

export function analyticsPage(url: string): { path: string; title: string } {
  // Discard query, fragment, matrix parameters and dynamic identifiers.
  const pathname = url.split(/[?#]/)[0].split('/').map(part => part.split(';')[0]).join('/');
  const clean = pathname.replace(/\/$/, '') || '/';
  const path = /^\/food\/restaurant\/[^/]+$/.test(clean) ? '/food/restaurant/:id' : clean;
  return Object.hasOwn(PAGES, path) ? { path, title: PAGES[path] } : { path: '/unknown', title: 'Otra pantalla' };
}
