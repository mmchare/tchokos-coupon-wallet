  const handleWhatsAppClick = () => {
    const productUrl = `${window.location.origin}/product/${id}`;
    const imageUrl = product?.images?.[0] || '';
    const message = `${t('product.whatsappHello')}

${t('product.whatsappInterested')}

🛍️ *${product.name}*
💰 ${t('product.whatsappPrice')}: ${product.price.toLocaleString()} FCFA

📷 ${t('product.whatsappPhoto')}: ${imageUrl}

🔗 ${t('product.whatsappLink')}: ${productUrl}

${t('product.moreInfo')}`;
    
    window.open(`https://wa.me/237678373080?text=${encodeURIComponent(message)}`, '_blank');
  };
