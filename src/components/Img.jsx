import { useState, useRef, useEffect } from 'react';
import { useLang } from '../lib/i18n.jsx';

/**
 * Image responsive : srcset WebP, placeholder flou, apparition douce.
 * fit="cover" remplit le conteneur parent (positionné).
 */
export default function Img({ media, sizes = '100vw', className = '', fit = 'cover', alt, eager = false, style, position }) {
  const { pick } = useLang();
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true); }, [media?.id]);
  if (!media) return <div className={`img img-empty ${className}`} style={style} />;
  const src = media.kind === 'image' ? media.src : (media.poster?.src || media.thumb);
  const srcset = media.kind === 'image' ? media.srcset : media.poster?.srcset;
  const ratio = media.width && media.height ? `${media.width} / ${media.height}` : undefined;
  return (
    <div className={`img img-${fit} ${loaded ? 'is-loaded' : ''} ${className}`}
      style={{ '--ratio': ratio, backgroundColor: media.color || '#111', backgroundImage: media.blur ? `url(${media.blur})` : undefined, ...style }}>
      {src && (
        <img ref={ref} src={src} srcSet={srcset || undefined} sizes={sizes} alt={alt ?? pick(media, 'alt')}
          loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)}
          style={position ? { objectPosition: position } : undefined} draggable="false" />
      )}
    </div>
  );
}
