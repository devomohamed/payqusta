const MANAGED_NODE_SELECTOR = '[data-payqusta-seo="true"]';

function ensureMeta(attribute, key) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]${MANAGED_NODE_SELECTOR}`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, key);
    node.setAttribute('data-payqusta-seo', 'true');
    document.head.appendChild(node);
  }
  return node;
}

function ensureLink(rel) {
  let node = document.head.querySelector(`link[rel="${rel}"]${MANAGED_NODE_SELECTOR}`);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    node.setAttribute('data-payqusta-seo', 'true');
    document.head.appendChild(node);
  }
  return node;
}

function setMeta(attribute, key, content) {
  if (!content) return;
  const node = ensureMeta(attribute, key);
  node.setAttribute('content', content);
}

function removeLink(rel) {
  const node = document.head.querySelector(`link[rel="${rel}"]${MANAGED_NODE_SELECTOR}`);
  if (node) node.remove();
}

export function applySeoMetadata({
  title,
  description,
  robots,
  canonical,
  keywords,
  openGraph = {},
  twitter = {},
  structuredData = [],
}) {
  if (typeof document === 'undefined') return;

  if (title) {
    document.title = title;
  }

  setMeta('name', 'description', description);
  setMeta('name', 'robots', robots);
  setMeta('name', 'keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);

  if (canonical) {
    const canonicalNode = ensureLink('canonical');
    canonicalNode.setAttribute('href', canonical);
  } else {
    removeLink('canonical');
  }

  const ogEntries = {
    'og:title': openGraph.title || title,
    'og:description': openGraph.description || description,
    'og:url': openGraph.url || canonical,
    'og:type': openGraph.type || 'website',
    'og:site_name': openGraph.siteName || 'PayQusta',
    'og:image': openGraph.image,
    'og:locale': openGraph.locale || 'ar_EG',
  };

  Object.entries(ogEntries).forEach(([key, value]) => {
    if (value) {
      setMeta('property', key, value);
    }
  });

  const twitterEntries = {
    'twitter:card': twitter.card || 'summary_large_image',
    'twitter:title': twitter.title || title,
    'twitter:description': twitter.description || description,
    'twitter:image': twitter.image || openGraph.image,
  };

  Object.entries(twitterEntries).forEach(([key, value]) => {
    if (value) {
      setMeta('name', key, value);
    }
  });

  const structuredDataId = 'payqusta-structured-data';
  const existingStructuredData = document.getElementById(structuredDataId);
  if (existingStructuredData) {
    existingStructuredData.remove();
  }

  if (Array.isArray(structuredData) && structuredData.length > 0) {
    const script = document.createElement('script');
    script.id = structuredDataId;
    script.type = 'application/ld+json';
    script.setAttribute('data-payqusta-seo', 'true');
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }
}
