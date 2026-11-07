export default function JewelryThumbnail({ url, name, hasPhoto }: { url?: string; name: string; hasPhoto: boolean }) {
  return url ? <img className="jewelry-thumbnail" src={url} alt={`Foto de identificação de ${name}`} loading="lazy"/> :
    <span className="jewelry-thumbnail jewelry-thumbnail-placeholder" aria-label={hasPhoto ? 'Foto indisponível no momento' : 'Sem foto de identificação'}>{hasPhoto ? 'Foto indisponível' : 'Sem foto'}</span>;
}
