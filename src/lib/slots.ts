// A slot entry is stored as "Name|Code" in digital_accounts.slot_codes.
export const encodeSlot = (name: string, code: string) => `${name.trim()}|${code.trim()}`;
export const decodeSlot = (raw: string | null | undefined, fallbackName = '') => {
  if (!raw) return { name: fallbackName, code: '' };
  const i = raw.indexOf('|');
  return i < 0 ? { name: fallbackName, code: raw.trim() } : { name: raw.slice(0, i).trim() || fallbackName, code: raw.slice(i + 1).trim() };
};

export const buildWhatsAppMessage = (p: { service: string; email: string; password: string; slotName: string; slotCode: string; expiresAt: string }) =>
  [
    `*JinBao — Votre abonnement ${p.service}*`,
    ``,
    `📧 Email : ${p.email}`,
    `🔑 Mot de passe : ${p.password}`,
    `👤 Votre profil : ${p.slotName}`,
    p.slotCode ? `🔢 Code du profil : ${p.slotCode}` : '',
    `📅 Expire le : ${new Date(p.expiresAt).toLocaleDateString('fr-FR')}`,
    ``,
    `Merci de n'utiliser que votre profil et de ne pas modifier le mot de passe.`,
  ].filter((l) => l !== '').join('\n');

export const whatsAppLink = (phone: string | null | undefined, text: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  const num = digits.length === 9 ? `237${digits}` : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
};
