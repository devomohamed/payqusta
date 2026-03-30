const Branch = require('../models/Branch');
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const { getTenantShippingSettings } = require('../utils/shippingHelpers');
const {
  getBranchAvailableQuantity,
  toIdString,
} = require('../utils/inventoryAllocation');

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function inferDistanceMeta(branchX, candidateBranch) {
  const branchXGov = normalizeText(branchX?.shippingOrigin?.governorate);
  const branchXCity = normalizeText(branchX?.shippingOrigin?.city);
  const candidateGov = normalizeText(candidateBranch?.shippingOrigin?.governorate);
  const candidateCity = normalizeText(candidateBranch?.shippingOrigin?.city);

  if (branchXCity && candidateCity && branchXCity === candidateCity) {
    return { distanceScore: 0, distanceLabel: 'نفس المدينة' };
  }

  if (branchXGov && candidateGov && branchXGov === candidateGov) {
    return { distanceScore: 1, distanceLabel: 'نفس المحافظة' };
  }

  return { distanceScore: 2, distanceLabel: 'محافظة مختلفة' };
}

function inferPreparationTime(branchType = 'store') {
  switch (branchType) {
    case 'warehouse':
      return 90;
    case 'fulfillment_center':
      return 45;
    case 'hybrid':
      return 60;
    case 'store':
    default:
      return 30;
  }
}

function sortCandidateBranches(left, right) {
  if (Boolean(left.canFulfillAll) !== Boolean(right.canFulfillAll)) {
    return left.canFulfillAll ? -1 : 1;
  }

  if (left.distanceScore !== right.distanceScore) {
    return left.distanceScore - right.distanceScore;
  }

  if (left.totalCoverageQty !== right.totalCoverageQty) {
    return right.totalCoverageQty - left.totalCoverageQty;
  }

  if (left.onlinePriority !== right.onlinePriority) {
    return left.onlinePriority - right.onlinePriority;
  }

  return String(left.branchName || '').localeCompare(String(right.branchName || ''), 'ar');
}

async function resolveFulfillmentBranch(invoice) {
  const tenant = await Tenant.findById(invoice.tenant).select('settings.shipping settings.onlineFulfillment');
  if (!tenant) {
    throw AppError.notFound('تعذر العثور على إعدادات المتجر المرتبطة بهذا الطلب');
  }

  const shippingSettings = getTenantShippingSettings(tenant);
  const branchId =
    toIdString(invoice.fulfillmentBranch) ||
    shippingSettings.defaultShippingBranchId ||
    toIdString(invoice.branch) ||
    toIdString(tenant?.settings?.onlineFulfillment?.defaultOnlineBranchId);

  if (!branchId) {
    throw AppError.badRequest('لم يتم تحديد Branch X في إعدادات الشحن بعد');
  }

  const branchX = await Branch.findOne({
    _id: branchId,
    tenant: invoice.tenant,
    isActive: true,
  }).lean();

  if (!branchX) {
    throw AppError.badRequest('فرع الشحن الافتراضي غير متاح أو تم تعطيله');
  }

  return { tenant, shippingSettings, branchX };
}

async function analyzeInvoiceFulfillment(invoice) {
  if (!invoice) throw AppError.notFound('الطلب غير موجود');

  const { branchX } = await resolveFulfillmentBranch(invoice);

  const candidateBranches = await Branch.find({
    tenant: invoice.tenant,
    isActive: true,
    _id: { $ne: branchX._id },
  })
    .select('name branchType onlinePriority shippingOrigin address participatesInOnlineOrders')
    .lean();

  const uniqueProductIds = [...new Set((invoice.items || []).map((item) => toIdString(item.product)).filter(Boolean))];
  const products = await Product.find({
    _id: { $in: uniqueProductIds },
    tenant: invoice.tenant,
  }).select('name sku inventory branchAvailability variants');

  const productMap = new Map(products.map((product) => [toIdString(product._id), product]));
  const branchAggregates = new Map();
  const itemAnalysis = [];
  const shortageItems = [];

  for (const item of invoice.items || []) {
    const product = productMap.get(toIdString(item.product));
    const variant = item.variant && product?.variants?.id ? product.variants.id(item.variant) : null;

    if (!product) {
      itemAnalysis.push({
        itemKey: `${toIdString(item.product)}:${toIdString(item.variant) || 'base'}`,
        productId: toIdString(item.product),
        variantId: toIdString(item.variant) || null,
        productName: item.productName || 'منتج محذوف',
        sku: item.sku || product?.sku || '',
        requestedQty: Number(item.quantity) || 0,
        branchXAvailableQty: 0,
        shortageQty: Number(item.quantity) || 0,
        status: 'product_missing',
        sourceOptions: [],
      });
      continue;
    }

    const requestedQty = Math.max(0, Number(item.quantity) || 0);
    const branchXAvailableQty = getBranchAvailableQuantity({
      product,
      variant,
      branchId: branchX._id,
      channel: 'online',
    });
    const shortageQty = Math.max(0, requestedQty - branchXAvailableQty);
    const itemKey = `${toIdString(item.product)}:${toIdString(item.variant) || 'base'}`;

    const sourceOptions = candidateBranches
      .map((branch) => {
        const availableQty = getBranchAvailableQuantity({
          product,
          variant,
          branchId: branch._id,
          channel: 'pos',
        });

        if (availableQty <= 0) return null;

        const { distanceScore, distanceLabel } = inferDistanceMeta(branchX, branch);
        return {
          branchId: toIdString(branch._id),
          branchName: branch.name,
          availableQty,
          onlinePriority: Number(branch.onlinePriority) || 100,
          branchType: branch.branchType || 'store',
          distanceScore,
          distanceLabel,
          preparationTimeMinutes: inferPreparationTime(branch.branchType),
          canCoverShortage: shortageQty > 0 ? availableQty >= shortageQty : true,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (Boolean(left.canCoverShortage) !== Boolean(right.canCoverShortage)) {
          return left.canCoverShortage ? -1 : 1;
        }
        if (left.distanceScore !== right.distanceScore) return left.distanceScore - right.distanceScore;
        if (left.availableQty !== right.availableQty) return right.availableQty - left.availableQty;
        return left.onlinePriority - right.onlinePriority;
      });

    const analysisRow = {
      itemKey,
      productId: toIdString(product._id),
      variantId: toIdString(item.variant) || null,
      productName: item.productName || product.name,
      sku: item.sku || variant?.sku || product.sku || '',
      requestedQty,
      branchXAvailableQty,
      shortageQty,
      status: shortageQty <= 0 ? 'ready_in_branch_x' : (sourceOptions.length > 0 ? 'needs_transfer' : 'no_stock'),
      bestSourceBranch: sourceOptions[0] || null,
      sourceOptions,
    };

    itemAnalysis.push(analysisRow);

    if (shortageQty > 0) {
      shortageItems.push(analysisRow);

      sourceOptions.forEach((option) => {
        const existing = branchAggregates.get(option.branchId) || {
          branchId: option.branchId,
          branchName: option.branchName,
          branchType: option.branchType,
          onlinePriority: option.onlinePriority,
          distanceScore: option.distanceScore,
          distanceLabel: option.distanceLabel,
          preparationTimeMinutes: option.preparationTimeMinutes,
          totalCoverageQty: 0,
          coveredItems: 0,
          itemCoverage: {},
        };

        existing.totalCoverageQty += Math.min(option.availableQty, shortageQty);
        existing.coveredItems += option.canCoverShortage ? 1 : 0;
        existing.itemCoverage[itemKey] = {
          productName: analysisRow.productName,
          availableQty: option.availableQty,
          shortageQty,
          canCoverShortage: option.canCoverShortage,
        };
        branchAggregates.set(option.branchId, existing);
      });
    }
  }

  const recommendedBranches = [...branchAggregates.values()]
    .map((branch) => ({
      ...branch,
      canFulfillAll: shortageItems.length > 0 && shortageItems.every((item) => branch.itemCoverage[item.itemKey]?.availableQty >= item.shortageQty),
      coveredItemCount: shortageItems.filter((item) => branch.itemCoverage[item.itemKey]?.availableQty > 0).length,
    }))
    .sort(sortCandidateBranches)
    .slice(0, 5);

  const totalShortageQty = shortageItems.reduce((sum, item) => sum + item.shortageQty, 0);
  const missingEverywhereCount = shortageItems.filter((item) => item.sourceOptions.length === 0).length;

  let scenario = 'branch_x_ready';
  let title = 'المخزون جاهز في Branch X';
  let message = `جميع الأصناف المطلوبة متاحة في ${branchX.name} ويمكن متابعة تجهيز الطلب مباشرة.`;

  if (totalShortageQty > 0 && shortageItems.length > 0) {
    if (missingEverywhereCount === shortageItems.length) {
      scenario = 'no_stock_any_branch';
      title = 'لا يوجد مخزون كافٍ في أي فرع';
      message = 'لا يوجد فرع بديل يغطي النواقص المطلوبة حاليًا، والطلب يحتاج قرار تأجيل أو إلغاء.';
    } else if (recommendedBranches.some((branch) => branch.canFulfillAll)) {
      scenario = 'single_source_transfer_available';
      title = 'يوجد فرع واحد مناسب للتحويل';
      message = 'يمكن تغطية النواقص من فرع واحد وإرسال طلب تحويل داخلي إلى Branch X.';
    } else {
      scenario = 'mixed_availability_review';
      title = 'التوافر مختلط ويحتاج مراجعة';
      message = 'بعض الأصناف متوفرة في فروع مختلفة، لكن لا يوجد فرع واحد يغطي كل النواقص ضمن حدود MVP الحالية.';
    }
  }

  return {
    scenario,
    title,
    message,
    branchX: {
      branchId: toIdString(branchX._id),
      name: branchX.name,
      address: branchX.address || '',
      branchType: branchX.branchType || 'store',
      governorate: branchX.shippingOrigin?.governorate || '',
      city: branchX.shippingOrigin?.city || '',
    },
    summary: {
      totalItems: itemAnalysis.length,
      shortageItems: shortageItems.length,
      totalShortageQty,
    },
    items: itemAnalysis,
    recommendedBranches,
    warnings: scenario === 'mixed_availability_review'
      ? ['لا يدعم MVP الحالي التجميع من أكثر من فرع لنفس الطلب']
      : [],
  };
}

module.exports = {
  analyzeInvoiceFulfillment,
  resolveFulfillmentBranch,
};
