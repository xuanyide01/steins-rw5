export function groupGallery(items){return items.map(item=>({id:item.label,image:item.image,label:item.label,variants:item.images.map(image=>({image}))}));}
export function stepVariant(i,d,n){return (i+d+n)%n;}
