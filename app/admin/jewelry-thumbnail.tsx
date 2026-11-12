import Image from 'next/image';
export default function JewelryThumbnail({ url, name, hasPhoto }: { url?: string; name: string; hasPhoto: boolean }) {
  return url ? <Image unoptimized width={56} height={56} className="jewelry-thumbnail" src={url} alt={`Foto de identificação de ${name}`} loading="lazy"/> :
    <span className="jewelry-thumbnail jewelry-thumbnail-placeholder" aria-label={hasPhoto ? 'Foto indisponível no momento' : 'Sem foto de identificação'}>{hasPhoto ? 'Foto indisponível' : 'Sem foto'}</span>;
}
