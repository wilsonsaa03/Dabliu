/**
 * DATOS DE CONTACTO, EMPRESA Y REDES DE DABLIU
 * Cambia aquí tus datos reales: se actualizan en toda la página.
 * Lo que quede vacío ('') no se muestra en la página.
 *
 * OJO: los datos de contacto también aparecen, escritos a mano, en
 *   - src/index.html (datos estructurados para Google)
 *   - public/politica-de-datos.html
 * Si cambias el número o el correo, cámbialos también allí.
 */
const whatsappNumber = '573153654978'; // sin espacios ni "+", con el indicativo 57

/** Mensaje con el que se abre WhatsApp desde los botones de la página. */
const whatsappGreeting = 'Hola DABLIU, quiero información sobre el diagnóstico tecnológico gratuito.';

export const CONTACT = {
  whatsappNumber,
  whatsappUrl: `https://wa.me/${whatsappNumber}`,
  whatsappChatUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappGreeting)}`,
  whatsappLabel: '+57 315 365 4978',
  email: 'contacto@dabliu.co', // ← confirma que este correo exista y reciba mensajes
  city: 'Buenaventura',
  region: 'Valle del Cauca',
  country: 'Colombia',
  /** Pon la URL del perfil real; si queda vacío, no se muestra. */
  social: [
    { label: 'LinkedIn', url: '' },
    { label: 'Instagram', url: '' },
    { label: 'GitHub', url: '' },
  ],
};

/** Datos legales. Si la empresa está registrada, completa el NIT. */
export const COMPANY = {
  name: 'DABLIU SOLUCIONES',
  nit: '', // ← p. ej. '901.234.567-8' (vacío = no se muestra)
  privacyPolicyUrl: 'politica-de-datos.html',
};

/**
 * Fundador para la sección "Nosotros". Si name queda vacío, la tarjeta no se muestra.
 * photo: archivo dentro de /public (p. ej. 'fundador.jpg').
 */
export const FOUNDER = {
  name: '',
  role: 'Fundador',
  photo: '',
  bio: '',
};
