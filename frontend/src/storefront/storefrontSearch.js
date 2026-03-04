function normalizeArabicLetters(value) {
  return value
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

export function normalizeStorefrontSearchText(value = '') {
  const normalizedValue = normalizeArabicLetters(String(value || '').toLowerCase());

  return normalizedValue
    .replace(/[^a-z0-9\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchTokens(value = '') {
  return normalizeStorefrontSearchText(value).split(' ').filter(Boolean);
}

function getLevenshteinDistance(source, target, maxDistance = 1) {
  if (source === target) return 0;
  if (!source || !target) return Math.max(source.length, target.length);
  if (Math.abs(source.length - target.length) > maxDistance) return maxDistance + 1;

  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const current = [sourceIndex];
    let rowMin = current[0];

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const cost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      const value = Math.min(
        previous[targetIndex] + 1,
        current[targetIndex - 1] + 1,
        previous[targetIndex - 1] + cost
      );

      current.push(value);
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > maxDistance) return maxDistance + 1;

    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[target.length];
}

function toWordList(value = '') {
  return getSearchTokens(value);
}

function getProductCategoryLabel(product) {
  if (typeof product?.category === 'object' && product?.category?.name) return product.category.name;
  if (product?.categoryName) return product.categoryName;
  if (typeof product?.category === 'string') return product.category;
  return '';
}

function getSearchableFields(product = {}) {
  const name = normalizeStorefrontSearchText(product?.name || '');
  const description = normalizeStorefrontSearchText(product?.description || '');
  const category = normalizeStorefrontSearchText(getProductCategoryLabel(product));
  const tags = normalizeStorefrontSearchText(Array.isArray(product?.tags) ? product.tags.join(' ') : '');
  const sku = normalizeStorefrontSearchText(product?.sku || '');
  const barcode = normalizeStorefrontSearchText(product?.barcode || '');
  const meta = [category, tags, sku, barcode].filter(Boolean).join(' ');

  return {
    name,
    description,
    category,
    meta,
    nameWords: toWordList(name),
    metaWords: toWordList(meta),
    descriptionWords: toWordList(description),
  };
}

function getTokenScore(token, words, rawText, exactScore, includeScore, fuzzyScore) {
  if (!token) return 0;
  if (rawText === token) return exactScore + 2;
  if (rawText.startsWith(token)) return exactScore;
  if (rawText.includes(token)) return includeScore;

  let score = 0;

  for (const word of words) {
    if (word === token) return exactScore;
    if (word.startsWith(token)) score = Math.max(score, includeScore);
    else if (word.includes(token)) score = Math.max(score, Math.max(1, includeScore - 1));
    else if (token.length >= 3 && word.length >= 3 && getLevenshteinDistance(word, token, 1) <= 1) {
      score = Math.max(score, fuzzyScore);
    }
  }

  return score;
}

export function getStorefrontSearchScore(product, query) {
  const normalizedQuery = normalizeStorefrontSearchText(query);
  if (!normalizedQuery) return 1;

  const tokens = getSearchTokens(normalizedQuery);
  if (tokens.length === 0) return 1;

  const fields = getSearchableFields(product);
  let totalScore = 0;

  for (const token of tokens) {
    const nameScore = getTokenScore(token, fields.nameWords, fields.name, 16, 11, 8);
    const metaScore = getTokenScore(token, fields.metaWords, fields.meta, 9, 7, 5);
    const descriptionScore = getTokenScore(token, fields.descriptionWords, fields.description, 5, 4, 3);
    const tokenScore = Math.max(nameScore, metaScore, descriptionScore);

    if (!tokenScore) return 0;

    totalScore += tokenScore;
  }

  if (fields.name.includes(normalizedQuery)) totalScore += 6;
  if (fields.meta.includes(normalizedQuery)) totalScore += 3;
  if ((product?.stock?.quantity ?? 0) > 0) totalScore += 1;

  return totalScore;
}

export function rankStorefrontProducts(products = [], query = '', options = {}) {
  const { limit = null } = options;

  const rankedProducts = products
    .map((product) => ({
      product,
      score: getStorefrontSearchScore(product, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;

      const leftStock = left.product?.stock?.quantity ?? 0;
      const rightStock = right.product?.stock?.quantity ?? 0;
      if (rightStock !== leftStock) return rightStock - leftStock;

      return String(left.product?.name || '').localeCompare(String(right.product?.name || ''), 'ar');
    })
    .map((entry) => entry.product);

  return typeof limit === 'number' ? rankedProducts.slice(0, limit) : rankedProducts;
}

export function buildStorefrontSearchSuggestions({ products = [], categories = [], query = '', limit = 6 } = {}) {
  const normalizedQuery = normalizeStorefrontSearchText(query);
  const categorySuggestions = categories
    .map((category) => ({
      id: category?._id || category?.value || category?.name || category,
      name: category?.name || category?.label || category,
      icon: category?.icon || '',
    }))
    .filter((category) => {
      if (!category.name) return false;
      if (!normalizedQuery) return true;
      return normalizeStorefrontSearchText(category.name).includes(normalizedQuery);
    })
    .slice(0, 4);

  return {
    products: normalizedQuery ? rankStorefrontProducts(products, normalizedQuery, { limit }) : [],
    categories: categorySuggestions,
  };
}
