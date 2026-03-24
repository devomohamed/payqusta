/**
 * Import Service — CSV/Excel Import for Products & Customers
 * Handles all 18 business scenarios for bulk product import
 */

const ExcelJS = require('exceljs');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Category = require('../models/Category');
const Branch = require('../models/Branch');
const Supplier = require('../models/Supplier');
const logger = require('../utils/logger');

// ── Header Mappings ──────────────────────────────────────────────────────────
const PRODUCT_HEADER_MAP = {
  'اسم المنتج': 'name',
  'sku': 'sku',
  'الباركود': 'barcode',
  'الباركود الدولي': 'internationalBarcode',
  'سعر البيع': 'price',
  'سعر التكلفة': 'cost',
  'سعر المقارنة': 'compareAtPrice',
  'سعر الجملة': 'wholesalePrice',
  'تكلفة الشحن': 'shippingCost',
  'الكمية': 'quantity',
  'الحد الأدنى للمخزون': 'minQuantity',
  'الوحدة': 'unit',
  'الفئة': 'category',
  'الفئة الفرعية': 'subcategory',
  'المورد': 'supplier',
  'الفرع': 'branch',
  'الوصف': 'description',
  'الكلمات المفتاحية': 'tags',
  'خاضع للضريبة': 'taxable',
  'نسبة الضريبة %': 'taxRate',
  'السعر يشمل الضريبة': 'priceIncludesTax',
  'تاريخ انتهاء الصلاحية': 'expiryDate',
  'الحالة': 'status',
};

// Also accept English headers
const PRODUCT_HEADER_MAP_EN = {
  'product name': 'name',
  'name': 'name',
  'sku': 'sku',
  'barcode': 'barcode',
  'international barcode': 'internationalBarcode',
  'selling price': 'price',
  'price': 'price',
  'cost': 'cost',
  'cost price': 'cost',
  'compare at price': 'compareAtPrice',
  'wholesale price': 'wholesalePrice',
  'shipping cost': 'shippingCost',
  'quantity': 'quantity',
  'stock': 'quantity',
  'min stock': 'minQuantity',
  'min quantity': 'minQuantity',
  'unit': 'unit',
  'category': 'category',
  'subcategory': 'subcategory',
  'supplier': 'supplier',
  'branch': 'branch',
  'description': 'description',
  'tags': 'tags',
  'keywords': 'tags',
  'taxable': 'taxable',
  'tax rate': 'taxRate',
  'tax rate %': 'taxRate',
  'price includes tax': 'priceIncludesTax',
  'expiry date': 'expiryDate',
  'status': 'status',
};

class ImportService {
  // ── Parse File ───────────────────────────────────────────────────────────
  async parseFile(filePath) {
    const workbook = new ExcelJS.Workbook();

    if (filePath.endsWith('.csv')) {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new Error('الملف فارغ أو لا يحتوي على بيانات');
    }

    // Get headers from first row
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const raw = String(cell.value || '').trim();
      // Remove * from required field markers
      const clean = raw.replace(/\s*\*\s*$/, '').trim().toLowerCase();
      headers[colNumber] = clean;
    });

    // Parse rows (skip empty rows)
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj = { _rowNumber: rowNumber };
      let hasValue = false;
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const val = cell.value;
          // Handle ExcelJS rich text
          if (val && typeof val === 'object' && val.richText) {
            obj[header] = val.richText.map(r => r.text).join('');
          } else if (val && typeof val === 'object' && val.result !== undefined) {
            obj[header] = val.result;
          } else {
            obj[header] = val;
          }
          if (val !== null && val !== undefined && String(val).trim() !== '') hasValue = true;
        }
      });
      // Scenario 12: skip completely empty rows
      if (hasValue) rows.push(obj);
    });

    return { headers: headers.filter(Boolean), rows, totalRows: rows.length };
  }

  // ── Normalize Row ────────────────────────────────────────────────────────
  _normalizeRow(rawRow) {
    const row = {};
    const allMaps = { ...PRODUCT_HEADER_MAP, ...PRODUCT_HEADER_MAP_EN };

    for (const [rawKey, rawVal] of Object.entries(rawRow)) {
      if (rawKey === '_rowNumber') { row._rowNumber = rawVal; continue; }
      const cleanKey = rawKey.replace(/\s*\*\s*$/, '').trim().toLowerCase();
      const mapped = allMaps[cleanKey];
      if (mapped && row[mapped] === undefined) {
        row[mapped] = rawVal;
      }
    }
    return row;
  }

  // ── Validate Row ─────────────────────────────────────────────────────────
  _validateRow(row, rowNum) {
    const errors = [];
    const warnings = [];

    // Scenario 8: required fields
    if (!row.name || String(row.name).trim() === '') {
      errors.push(`صف ${rowNum}: اسم المنتج مطلوب`);
    }
    const price = Number(row.price);
    const cost = Number(row.cost);
    const quantity = Number(row.quantity);

    if (row.price === undefined || row.price === null || row.price === '' || isNaN(price)) {
      errors.push(`صف ${rowNum}: سعر البيع مطلوب`);
    }
    if (row.cost === undefined || row.cost === null || row.cost === '' || isNaN(cost)) {
      errors.push(`صف ${rowNum}: سعر التكلفة مطلوب`);
    }
    if (row.quantity === undefined || row.quantity === null || row.quantity === '' || isNaN(quantity)) {
      errors.push(`صف ${rowNum}: الكمية مطلوبة`);
    }

    // Scenario 10: negative values
    if (!isNaN(price) && price < 0) errors.push(`صف ${rowNum}: سعر البيع لا يمكن أن يكون سالباً`);
    if (!isNaN(cost) && cost < 0) errors.push(`صف ${rowNum}: سعر التكلفة لا يمكن أن يكون سالباً`);
    if (!isNaN(quantity) && quantity < 0) errors.push(`صف ${rowNum}: الكمية لا يمكن أن تكون سالبة`);

    // Scenario 9: zero price warning
    if (!isNaN(price) && price === 0) {
      warnings.push(`صف ${rowNum}: سعر البيع = 0 (منتج مجاني؟)`);
    }

    // Scenario 11: compareAtPrice less than price
    if (row.compareAtPrice !== undefined && row.compareAtPrice !== '') {
      const cap = Number(row.compareAtPrice);
      if (!isNaN(cap) && !isNaN(price) && cap < price) {
        warnings.push(`صف ${rowNum}: سعر المقارنة أقل من سعر البيع`);
      }
    }

    // Scenario 18: expired product
    if (row.expiryDate) {
      const expDate = new Date(row.expiryDate);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        warnings.push(`صف ${rowNum}: المنتج منتهي الصلاحية (${row.expiryDate})`);
      }
    }

    return { errors, warnings };
  }

  // ── Import Products (Full Version) ───────────────────────────────────────
  async importProducts(rows, tenantId, options = {}) {
    const { skipDuplicates = true, updateExisting = false } = options;
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      details: [],  // Per-row details for the report
    };

    // ── Pre-load lookups ──
    const [allCategories, allBranches, allSuppliers] = await Promise.all([
      Category.find({ tenant: tenantId }).lean(),
      Branch.find({ tenant: tenantId, isActive: true }).lean(),
      Supplier.find({ tenant: tenantId }).lean(),
    ]);

    // Build lookup maps (case-insensitive)
    const categoryMap = {};
    allCategories.forEach(c => { categoryMap[c.name.trim().toLowerCase()] = c; });

    const branchMap = {};
    allBranches.forEach(b => { branchMap[b.name.trim().toLowerCase()] = b; });
    const defaultBranch = allBranches[0]; // First branch = default

    const supplierMap = {};
    allSuppliers.forEach(s => { supplierMap[s.name.trim().toLowerCase()] = s; });

    // ── Process each row ──
    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNum = rawRow._rowNumber || (i + 2);
      const row = this._normalizeRow(rawRow);

      // ── Validate ──
      const { errors, warnings } = this._validateRow(row, rowNum);
      if (warnings.length > 0) results.warnings.push(...warnings);
      if (errors.length > 0) {
        results.errors.push(...errors);
        results.details.push({ row: rowNum, status: 'error', message: errors.join(', ') });
        continue;
      }

      try {
        const name = String(row.name).trim();
        const sku = row.sku ? String(row.sku).trim() : '';
        const barcode = row.barcode ? String(row.barcode).trim() : '';
        const internationalBarcode = row.internationalBarcode ? String(row.internationalBarcode).trim() : '';

        // ── Step 1: Resolve Category / Subcategory (Moved earlier to support updates) ──
        let categoryId = null;
        let subcategoryId = null;
        let categoryName = '';

        if (row.category) {
          const catName = String(row.category).trim();
          const catKey = catName.toLowerCase();

          if (categoryMap[catKey]) {
            categoryId = categoryMap[catKey]._id;
            categoryName = categoryMap[catKey].name;
          } else {
            // Auto-create category
            const newCat = await Category.create({ tenant: tenantId, name: catName });
            categoryMap[catKey] = newCat;
            allCategories.push(newCat); // Sync the cache for subcategory lookup
            categoryId = newCat._id;
            categoryName = catName;
            results.warnings.push(`صف ${rowNum}: تم إنشاء فئة جديدة "${catName}"`);
          }

          // Subcategory
          if (row.subcategory) {
            const subName = String(row.subcategory).trim();
            const subKey = subName.toLowerCase();
            // Look for subcategory under this parent
            const existingSub = allCategories.find(
              c => c.name.trim().toLowerCase() === subKey && c.parent && c.parent.toString() === categoryId.toString()
            ) || categoryMap[`${catKey}__${subKey}`];

            if (existingSub) {
              subcategoryId = existingSub._id;
            } else {
              const newSub = await Category.create({ tenant: tenantId, name: subName, parent: categoryId });
              categoryMap[`${catKey}__${subKey}`] = newSub;
              allCategories.push(newSub); // Sync the cache
              subcategoryId = newSub._id;
              results.warnings.push(`صف ${rowNum}: تم إنشاء فئة فرعية "${subName}" تحت "${catName}"`);
            }
          }
        }

        // ── Scenario 2 & 3: Check duplicates (SKU / Barcode) ──
        const duplicateOr = [];
        if (sku) duplicateOr.push({ sku: sku.toUpperCase() });
        if (barcode) duplicateOr.push({ barcode });
        if (internationalBarcode) duplicateOr.push({ internationalBarcode });

        let existing = null;
        if (duplicateOr.length > 0) {
          existing = await Product.findOne({ tenant: tenantId, $or: duplicateOr });
        }

        // Scenario 17: same name, no SKU/barcode → warn but still add
        if (!existing && !sku && !barcode) {
          const sameNameProduct = await Product.findOne({ tenant: tenantId, name });
          if (sameNameProduct) {
            results.warnings.push(`صف ${rowNum}: منتج بنفس الاسم "${name}" موجود بالفعل (قد يكون مكرراً)`);
          }
        }

        if (existing) {
          if (updateExisting) {
            const updateData = this._buildUpdateData(row, categoryId, subcategoryId, categoryName);
            await Product.findByIdAndUpdate(existing._id, { $set: updateData });
            results.updated++;
            results.details.push({ row: rowNum, status: 'updated', name });
          } else if (skipDuplicates) {
            results.skipped++;
            results.details.push({ row: rowNum, status: 'skipped', name, message: 'منتج مكرر' });
          }
          continue;
        }

        // ── Step 2: Resolve Rest (Supplier, etc) ──

        // ── Scenario 6: Supplier ──
        let supplierId = null;
        if (row.supplier) {
          const supName = String(row.supplier).trim().toLowerCase();
          if (supplierMap[supName]) {
            supplierId = supplierMap[supName]._id;
          } else {
            results.warnings.push(`صف ${rowNum}: المورد "${row.supplier}" غير موجود — تم تخطيه`);
          }
        }

        // ── Scenario 7: Branch ──
        let targetBranch = defaultBranch;
        if (row.branch) {
          const brName = String(row.branch).trim().toLowerCase();
          if (branchMap[brName]) {
            targetBranch = branchMap[brName];
          } else {
            results.warnings.push(`صف ${rowNum}: الفرع "${row.branch}" غير موجود — تم استخدام الفرع الرئيسي`);
          }
        }

        // ── Parse boolean fields ──
        const taxable = this._parseBoolean(row.taxable, true);
        const priceIncludesTax = this._parseBoolean(row.priceIncludesTax, false);
        const isActive = row.status ? !['غير نشط', 'inactive', 'no', 'لا'].includes(String(row.status).trim().toLowerCase()) : true;

        // ── Parse tags ──
        let tags = [];
        if (row.tags) {
          tags = String(row.tags).split(/[,،]/).map(t => t.trim()).filter(Boolean);
        }

        // ── Parse expiry date ──
        let expiryDate = null;
        if (row.expiryDate) {
          const d = new Date(row.expiryDate);
          if (!isNaN(d.getTime())) expiryDate = d;
        }

        // ── Build inventory ──
        const quantity = Math.max(0, Number(row.quantity) || 0);
        const minQuantity = Number(row.minQuantity) || 5;
        const inventory = [];
        if (targetBranch) {
          inventory.push({
            branch: targetBranch._id,
            quantity,
            minQuantity,
          });
        }

        // ── Create product ──
        await Product.create({
          tenant: tenantId,
          name,
          sku: sku || undefined,
          barcode: barcode || undefined,
          internationalBarcode: internationalBarcode || undefined,
          price: Number(row.price) || 0,
          cost: Number(row.cost) || 0,
          compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : undefined,
          wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : 0,
          shippingCost: row.shippingCost ? Number(row.shippingCost) : 0,
          category: categoryId || undefined,
          subcategory: subcategoryId || undefined,
          categoryName: categoryName || undefined,
          supplier: supplierId || undefined,
          description: row.description ? String(row.description) : '',
          tags,
          taxable,
          taxRate: row.taxRate !== undefined && row.taxRate !== '' ? Number(row.taxRate) : 14,
          priceIncludesTax,
          expiryDate,
          isActive,
          stock: {
            quantity,
            minQuantity,
            unit: row.unit ? String(row.unit).trim() : 'قطعة',
          },
          inventory,
        });

        results.created++;
        results.details.push({ row: rowNum, status: 'created', name });
      } catch (err) {
        results.errors.push(`صف ${rowNum}: ${err.message}`);
        results.details.push({ row: rowNum, status: 'error', message: err.message });
      }
    }

    return results;
  }

  // ── Build Update Data ────────────────────────────────────────────────────
  _buildUpdateData(row, categoryId = null, subcategoryId = null, categoryName = '') {
    const data = {};
    if (row.price !== undefined && row.price !== '') data.price = Number(row.price);
    if (row.cost !== undefined && row.cost !== '') data.cost = Number(row.cost);
    if (row.compareAtPrice !== undefined && row.compareAtPrice !== '') data.compareAtPrice = Number(row.compareAtPrice);
    if (row.wholesalePrice !== undefined && row.wholesalePrice !== '') data.wholesalePrice = Number(row.wholesalePrice);
    if (row.description) data.description = String(row.description);
    if (row.quantity !== undefined && row.quantity !== '') data['stock.quantity'] = Number(row.quantity);
    if (row.minQuantity !== undefined && row.minQuantity !== '') data['stock.minQuantity'] = Number(row.minQuantity);
    if (row.unit) data['stock.unit'] = String(row.unit);
    if (row.taxRate !== undefined && row.taxRate !== '') data.taxRate = Number(row.taxRate);
    if (row.taxable !== undefined) data.taxable = this._parseBoolean(row.taxable, true);
    if (row.priceIncludesTax !== undefined) data.priceIncludesTax = this._parseBoolean(row.priceIncludesTax, false);
    if (row.tags) data.tags = String(row.tags).split(/[,،]/).map(t => t.trim()).filter(Boolean);
    
    // Update Category/Subcategory if resolved
    if (categoryId) data.category = categoryId;
    if (subcategoryId) data.subcategory = subcategoryId;
    if (categoryName) data.categoryName = categoryName;

    return data;
  }



  // ── Parse Boolean ────────────────────────────────────────────────────────
  _parseBoolean(val, defaultVal) {
    if (val === undefined || val === null || val === '') return defaultVal;
    const str = String(val).trim().toLowerCase();
    return ['نعم', 'yes', 'true', '1', 'صحيح'].includes(str);
  }

  // ── Import Customers ─────────────────────────────────────────────────────
  async importCustomers(rows, tenantId, options = {}) {
    const { skipDuplicates = true, updateExisting = false } = options;
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = row.name || row['اسم العميل'] || row['الاسم'];
        const phone = String(row.phone || row['رقم الهاتف'] || row['الهاتف'] || '').trim();

        if (!name || !phone) {
          results.errors.push({ row: i + 2, error: 'الاسم ورقم الهاتف مطلوبين' });
          continue;
        }

        const existing = await Customer.findOne({ tenant: tenantId, $or: [{ phone }, { name }] });

        if (existing) {
          if (updateExisting) {
            await Customer.findByIdAndUpdate(existing._id, {
              email: row.email || row['البريد'] || existing.email,
              address: row.address || row['العنوان'] || existing.address,
              notes: row.notes || row['ملاحظات'] || existing.notes,
            });
            results.updated++;
          } else if (skipDuplicates) {
            results.skipped++;
          }
          continue;
        }

        await Customer.create({
          tenant: tenantId,
          name,
          phone,
          email: row.email || row['البريد'] || '',
          address: row.address || row['العنوان'] || '',
          notes: row.notes || row['ملاحظات'] || '',
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: i + 2, error: err.message });
      }
    }

    return results;
  }

  // ── Generate Template ────────────────────────────────────────────────────
  async generateTemplate(type) {
    const workbook = new ExcelJS.Workbook();
    workbook.views = [{ rightToLeft: true }];

    if (type === 'products') {
      const ws = workbook.addWorksheet('المنتجات');

      const columns = [
        { header: 'اسم المنتج *', key: 'name', width: 25 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'الباركود', key: 'barcode', width: 18 },
        { header: 'الباركود الدولي', key: 'internationalBarcode', width: 18 },
        { header: 'سعر البيع *', key: 'price', width: 14 },
        { header: 'سعر التكلفة *', key: 'cost', width: 14 },
        { header: 'سعر المقارنة', key: 'compareAtPrice', width: 14 },
        { header: 'سعر الجملة', key: 'wholesalePrice', width: 14 },
        { header: 'تكلفة الشحن', key: 'shippingCost', width: 14 },
        { header: 'الكمية *', key: 'quantity', width: 12 },
        { header: 'الحد الأدنى للمخزون', key: 'minQuantity', width: 18 },
        { header: 'الوحدة', key: 'unit', width: 12 },
        { header: 'الفئة', key: 'category', width: 16 },
        { header: 'الفئة الفرعية', key: 'subcategory', width: 16 },
        { header: 'المورد', key: 'supplier', width: 18 },
        { header: 'الفرع', key: 'branch', width: 16 },
        { header: 'الوصف', key: 'description', width: 30 },
        { header: 'الكلمات المفتاحية', key: 'tags', width: 22 },
        { header: 'خاضع للضريبة', key: 'taxable', width: 14 },
        { header: 'نسبة الضريبة %', key: 'taxRate', width: 14 },
        { header: 'السعر يشمل الضريبة', key: 'priceIncludesTax', width: 18 },
        { header: 'تاريخ انتهاء الصلاحية', key: 'expiryDate', width: 20 },
        { header: 'الحالة', key: 'status', width: 12 },
      ];
      ws.columns = columns;

      // Style headers
      const headerRow = ws.getRow(1);
      headerRow.height = 35;
      headerRow.eachCell((cell, colNumber) => {
        const isRequired = columns[colNumber - 1]?.header.includes('*');
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isRequired ? 'FF1E3A5F' : 'FF3B6AA0' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF4A90D9' } },
          bottom: { style: 'thin', color: { argb: 'FF4A90D9' } },
          left: { style: 'thin', color: { argb: 'FF4A90D9' } },
          right: { style: 'thin', color: { argb: 'FF4A90D9' } },
        };
      });

      // Sample data rows
      const samples = [
        {
          name: 'شاي أحمر 500 جرام', sku: 'TEA-RED-500', barcode: '6221234567890',
          internationalBarcode: '', price: 25, cost: 15, compareAtPrice: 30,
          wholesalePrice: 20, shippingCost: 0, quantity: 100, minQuantity: 10,
          unit: 'علبة', category: 'مشروبات', subcategory: 'شاي وقهوة',
          supplier: 'شركة المشروبات', branch: 'الفرع الرئيسي',
          description: 'شاي أحمر فاخر 500 جرام', tags: 'شاي,مشروبات,أحمر',
          taxable: 'نعم', taxRate: 14, priceIncludesTax: 'لا', expiryDate: '2027-06-30', status: 'نشط',
        },
        {
          name: 'قهوة عربية 250 جرام', sku: 'COFFEE-AR-250', barcode: '6229876543210',
          internationalBarcode: '', price: 45, cost: 28, compareAtPrice: 55,
          wholesalePrice: 38, shippingCost: 0, quantity: 50, minQuantity: 5,
          unit: 'علبة', category: 'مشروبات', subcategory: 'شاي وقهوة',
          supplier: '', branch: '',
          description: 'قهوة عربية أصيلة', tags: 'قهوة,عربي',
          taxable: 'نعم', taxRate: 14, priceIncludesTax: 'لا', expiryDate: '2027-12-31', status: 'نشط',
        },
      ];

      samples.forEach((sample, idx) => {
        const dataRow = ws.addRow(sample);
        dataRow.eachCell(cell => {
          cell.font = { size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: idx % 2 === 0 ? 'FFF0F4FF' : 'FFFFFFFF' },
          };
        });
      });

      // ── Instructions sheet ──
      const ws2 = workbook.addWorksheet('تعليمات');
      ws2.views = [{ rightToLeft: true }];
      ws2.getColumn(1).width = 35;
      ws2.getColumn(2).width = 55;

      const instructions = [
        ['📋 تعليمات استخدام الـ Template', ''],
        ['', ''],
        ['الأعمدة المطلوبة (*)', 'اسم المنتج ، سعر البيع ، سعر التكلفة ، الكمية'],
        ['الكمية', 'رقم 0 أو أكثر'],
        ['خاضع للضريبة', 'نعم / لا (الافتراضي: نعم)'],
        ['السعر يشمل الضريبة', 'نعم / لا (الافتراضي: لا)'],
        ['نسبة الضريبة', 'رقم من 0 إلى 100 (الافتراضي: 14%)'],
        ['الحالة', 'نشط / غير نشط (الافتراضي: نشط)'],
        ['تاريخ انتهاء الصلاحية', 'بالصيغة YYYY-MM-DD مثال: 2027-12-31'],
        ['الكلمات المفتاحية', 'مفصولة بفاصلة مثال: شاي,مشروبات,ساخن'],
        ['الفئة / الفئة الفرعية', 'سيتم إنشاؤها تلقائياً إن لم تكن موجودة'],
        ['SKU / الباركود', 'يجب أن يكون فريداً لكل منتج'],
        ['الفرع', 'اسم الفرع الموجود — إذا ترك فارغاً يُضاف للفرع الرئيسي'],
        ['المورد', 'اسم المورد الموجود — إذا لم يُعثر عليه يتم تخطيه مع تنبيه'],
      ];

      instructions.forEach(([key, val], idx) => {
        const row = ws2.getRow(idx + 1);
        row.getCell(1).value = key;
        row.getCell(1).font = { bold: true, size: 11 };
        row.getCell(2).value = val;
        row.getCell(2).font = { size: 11 };
      });

    } else {
      // Customers template (unchanged)
      const ws = workbook.addWorksheet('العملاء');
      ws.columns = [
        { header: 'اسم العميل', key: 'name', width: 25 },
        { header: 'رقم الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'العنوان', key: 'address', width: 30 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
      ];

      ws.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ws.addRow({ name: 'أحمد محمد', phone: '01012345678', email: 'ahmed@email.com', address: 'القاهرة', notes: 'عميل VIP' });
    }

    return workbook;
  }
}

module.exports = new ImportService();
