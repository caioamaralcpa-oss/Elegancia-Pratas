import Image from 'next/image';
export default function JewelryThumbnail({ url, name, hasPhoto, size = 56 }: { url?: string; name: string; hasPhoto: boolean; size?: number }) {
  return url ? <Image unoptimized width={size} height={size} className="jewelry-thumbnail" src={url} alt={`Foto de identificação de ${name}`} loading="lazy"/> :
    <span className="jewelry-thumbnail jewelry-thumbnail-placeholder" aria-label={hasPhoto ? 'Foto indisponível no momento' : 'Sem foto de identificação'}>{hasPhoto ? 'Foto indisponível' : 'Sem foto'}</span>;
}
