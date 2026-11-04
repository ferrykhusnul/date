import type { IconName } from './Icon';
import { Icon } from './Icon';

/**
 * Visual placeholder for a venue (the dataset has no photos). A soft tinted
 * tile with the category's icon and a few decorative sparkles.
 */
const ART: Record<string, { icon: IconName; tint: string }> = {
  kafe: { icon: 'coffee', tint: 'peach' },
  restoran: { icon: 'utensils', tint: 'rose' },
  bar: { icon: 'star', tint: 'lilac' },
  taman: { icon: 'leaf', tint: 'sage' },
  'wisata-alam': { icon: 'leaf', tint: 'sage' },
  museum: { icon: 'palette', tint: 'lilac' },
  galeri: { icon: 'palette', tint: 'lilac' },
  bioskop: { icon: 'film', tint: 'blush' },
  'pusat-belanja': { icon: 'bag', tint: 'butter' },
  pasar: { icon: 'bag', tint: 'butter' },
  hiburan: { icon: 'gamepad', tint: 'blush' },
  'toko-buku': { icon: 'star', tint: 'peach' },
  custom: { icon: 'heart', tint: 'rose' },
};

export function VenueArt({
  category,
  size = 'md',
  className = '',
}: {
  category?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const art = ART[category ?? ''] ?? { icon: 'heart' as IconName, tint: 'blush' };
  const iconSize = size === 'lg' ? 44 : size === 'md' ? 32 : 22;
  return (
    <div className={`venue-art venue-art--${size} tint-${art.tint} ${className}`.trim()} aria-hidden="true">
      <span className="venue-art-deco venue-art-deco--a">✦</span>
      <span className="venue-art-deco venue-art-deco--b">♡</span>
      <span className="venue-art-icon">
        <Icon name={art.icon} size={iconSize} />
      </span>
    </div>
  );
}
