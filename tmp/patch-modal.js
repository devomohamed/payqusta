const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/New folder (3)/payqusta/frontend/src/pages/ProductsPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add Icons to import
content = content.replace(
    /import \{ Plus([^}]+)\} from 'lucide-react';/,
    "import { Plus$1, Layers, Box } from 'lucide-react';"
);

// 2. Replace the modal entirely.
// We'll extract everything between <Modal open={showModal} onClose={handleCloseModal} title={editId ? 'تعديل منتج' : 'إضافة منتج جديد'} size="lg">
// and </Modal> (around line 622 to 963).
const modalStartRegex = /<Modal open=\{showModal\}[^>]*title=\{editId \? 'تعديل منتج' : 'إضافة منتج جديد'\}[^>]*>/;
const modalEnd = `          </Modal>

          {/* Barcode Scanner Modal */}`;

const startIndex = content.search(modalStartRegex);
const endIndex = content.indexOf(modalEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find Modal boundaries");
    process.exit(1);
}

const modalContent = `          <Modal open={showModal} onClose={handleCloseModal} title={editId ? 'تعديل منتج' : 'إضافة منتج جديد'} size="xl">
            {/* Tabs Header */}
            <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1.5 rounded-xl overflow-x-auto no-scrollbar gap-1 mb-6 flex-wrap sm:flex-nowrap border border-gray-200 dark:border-gray-800">
              {[
                { id: 'basic', label: 'الأساسية', icon: Package },
                { id: 'pricing', label: 'التسعير', icon: Tag },
                { id: 'inventory', label: 'المخزون', icon: Box },
                { id: 'variants', label: 'الموديلات', icon: Layers },
                { id: 'images', label: 'الصور', icon: ImageIcon }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id)}
                    className={\`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-300 \${
                      activeModalTab === tab.id
                        ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200/50 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                    }\`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="min-h-[300px]">
              {/* TAB: Basic */}
              {activeModalTab === 'basic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <div className="sm:col-span-2">
                    <Input label="اسم المنتج *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Input label="كود SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  </div>

                  <div className="relative">
                    <Input
                      label="الباركود"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="أدخل الباركود أو امسحه"
                    />
                    <div className="absolute left-2 top-[34px] flex gap-1 z-10">
                      <button
                        type="button"
                        onClick={() => setShowProductSearch(true)}
                        className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                        title="بحث عن منتج لاستيراد البيانات"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBarcodeScanner(true)}
                        className="p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                        title="مسح بالكاميرا"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <RichTextEditor
                      label="وصف المنتج"
                      value={form.description}
                      onChange={(content) => setForm({ ...form, description: content })}
                    />
                  </div>

                  <div className="z-[60] sm:col-span-2">
                    <CategorySelector
                      label="التصنيف"
                      value={form.subcategory || form.category}
                      onChange={(id) => {
                        if (!id) {
                          setForm({ ...form, category: '', subcategory: '' });
                          return;
                        }
                        const findInTree = (items, targetId, parentId = null) => {
                          for (const item of items) {
                            if (item._id === targetId) return { ...item, parentId };
                            if (item.children) {
                              const found = findInTree(item.children, targetId, item._id);
                              if (found) return found;
                            }
                          }
                          return null;
                        };
                        const selected = findInTree(categories, id);
                        if (selected?.parentId) {
                          setForm({ ...form, category: selected.parentId, subcategory: id });
                        } else {
                          setForm({ ...form, category: id, subcategory: '' });
                        }
                      }}
                      categories={categories}
                      placeholder="اختر تصنيفاً..."
                    />
                  </div>
                </div>
              )}

              {/* TAB: Pricing */}
              {activeModalTab === 'pricing' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <div>
                    <Input label="سعر البيع *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} error={!form.price && 'السعر مطلوب'} />
                  </div>
                  <div>
                    <Input label="السعر قبل الخصم" type="number" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} placeholder="يظهر مشطوب عليه كعرض" />
                  </div>
                  <div>
                    <Input label="سعر التكلفة *" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} error={!form.cost && 'التكلفة مطلوبة'} />
                  </div>
                  <div>
                    <Input label="سعر الجملة" type="number" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })} placeholder="اختياري" />
                  </div>
                  <div>
                    <Input label="تكلفة الشحن" type="number" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} placeholder="اختياري" />
                  </div>

                  {form.price && form.cost && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:col-span-2">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-center border border-emerald-100 dark:border-emerald-500/20">
                        <span className="text-xs text-gray-500 block mb-1">صافي الربح: </span>
                        <span className="text-lg font-extrabold text-emerald-500">{(Number(form.price) - Number(form.cost) - Number(form.shippingCost || 0)).toLocaleString('ar-EG')} ج.م</span>
                      </div>
                      <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl text-center border border-primary-100 dark:border-primary-500/20">
                        <span className="text-xs text-gray-500 block mb-1">هامش الربح: </span>
                        <span className="text-lg font-extrabold text-primary-500">
                          {form.cost > 0 ? (((Number(form.price) - Number(form.cost)) / Number(form.cost)) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Inventory */}
              {activeModalTab === 'inventory' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  {(user?.role === 'admin' || user?.role === 'vendor') && (
                    <div className="sm:col-span-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                      <Select
                        label="الفرع المرتبط بالمنتج"
                        value={form.branchId}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                        options={[
                          { value: '', label: 'اختر الفرع...' },
                          ...branches.map(b => ({ value: b._id, label: \`🏢 \${b.name}\` }))
                        ]}
                      />
                      <p className="text-[10px] text-blue-500 font-bold mt-2">
                        * سيتم إضافة الكمية المخزنية لهذا الفرع تحديداً.
                      </p>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <Select label="المورد" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      options={[{ value: '', label: 'بدون مورد' }, ...suppliers.map((s) => ({ value: s._id, label: \`🚛 \${s.name}\` }))]} />
                  </div>

                  <div>
                    <Input label="الكمية الإجمالية بالمخزون" type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
                  </div>
                  <div>
                    <Input label="الحد الأدنى (للتنبيه)" type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.expiryDate}
                        onChange={(e) => setForm({ ...form, expiryDate: e.target.checked ? new Date().toISOString().split('T')[0] : '' })}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">للمنتج تاريخ صلاحية</span>
                    </label>

                    {form.expiryDate && (
                      <Input
                        type="date"
                        value={form.expiryDate ? form.expiryDate.split('T')[0] : ''}
                        onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Variants */}
              {activeModalTab === 'variants' && (
                <div className="animate-fade-in pt-1">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h5 className="font-bold text-gray-800 dark:text-white">قائمة الموديلات الإضافية</h5>
                      <p className="text-xs text-gray-500">أضف مقاسات أو ألوان لتتبع كمياتها المستقلة</p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => setForm({
                        ...form,
                        variants: [...form.variants, {
                          sku: \`\${form.sku}-\${form.variants.length + 1}\`,
                          barcode: '',
                          price: form.price,
                          compareAtPrice: form.compareAtPrice,
                          cost: form.cost,
                          stock: form.stockQuantity || 0,
                          attributes: { الحجم: '', اللون: '' }
                        }]
                      })}
                    >
                      إضافة موديل
                    </Button>
                  </div>

                  {form.variants.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2 pb-10">
                      {form.variants.map((v, idx) => (
                        <div key={idx} className="p-4 bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-100 dark:border-gray-800 relative group transition-all hover:border-gray-200 dark:hover:border-gray-700">
                          <button
                            onClick={() => {
                              const next = [...form.variants];
                              next.splice(idx, 1);
                              setForm({ ...form, variants: next });
                            }}
                            className="absolute -top-3 -right-3 p-1.5 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-red-100 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Input
                              label="المقاس / الحجم"
                              value={v.attributes?.['الحجم'] || ''}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx].attributes = { ...next[idx].attributes, 'الحجم': e.target.value };
                                setForm({ ...form, variants: next });
                              }}
                            />
                            <Input
                              label="اللون / الطراز"
                              value={v.attributes?.['اللون'] || ''}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx].attributes = { ...next[idx].attributes, 'اللون': e.target.value };
                                setForm({ ...form, variants: next });
                              }}
                            />
                            <Input
                              label="الباركود"
                              value={v.barcode}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx].barcode = e.target.value;
                                setForm({ ...form, variants: next });
                              }}
                            />
                            <Input
                              label="سعر البيع"
                              type="number"
                              value={v.price}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx].price = e.target.value;
                                setForm({ ...form, variants: next });
                              }}
                            />
                            <Input
                              label="مخزون الموديل"
                              type="number"
                              value={v.stock}
                              onChange={(e) => {
                                const next = [...form.variants];
                                next[idx].stock = e.target.value;
                                setForm({ ...form, variants: next });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
                      <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 font-semibold mb-1">لا توجد موديلات للأن</p>
                      <p className="text-xs text-gray-400">انقر على الزر بالأعلى لإضافة مقاس أو لون جديد لهذا المنتج</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Images */}
              {activeModalTab === 'images' && (
                <div className="animate-fade-in pt-1">
                  {/* Image Upload Button */}
                  <label className="flex items-center justify-center gap-2 px-4 py-8 rounded-2xl border-2 border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-400 dark:hover:border-primary-600 transition-all duration-300">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    {uploadingImage ? (
                      <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-800/50 flex items-center justify-center mb-1 transition-transform duration-300">
                          <Upload className="w-6 h-6 text-primary-500" />
                        </div>
                        <span className="text-base font-bold text-gray-700 dark:text-gray-200">
                          {editId ? 'إضافة صور للمنتج' : 'اختر صور المنتج (ستُرفع مع الحفظ)'}
                        </span>
                        <span className="text-sm text-gray-400">انقر هنا أو اسحب الصور للداخل</span>
                      </div>
                    )}
                  </label>

                  {/* Images Grid */}
                  {(productImages.length > 0 || pendingImages.length > 0) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                      {/* Existing Images */}
                      {productImages.map((img, idx) => (
                        <div key={\`exist-\${idx}\`} className="relative group aspect-square rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
                          <img
                            src={img}
                            alt={\`Product \${idx + 1}\`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          {idx === 0 && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded shadow-sm bg-primary-500 text-white text-[10px] font-bold">
                              الغلاف
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteImage(img)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm backdrop-blur-sm"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Pending Images */}
                      {pendingImages.map((file, idx) => (
                        <div key={\`pending-\${idx}\`} className="relative group aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 opacity-90 border-2 border-dashed border-primary-300 dark:border-primary-700">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={\`Pending \${idx + 1}\`}
                            className="w-full h-full object-cover"
                            onLoad={(e) => URL.revokeObjectURL(e.target.src)} // Free memory
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold shadow-sm">
                            جديدة (انتظار القيود)
                          </div>
                          <button
                            onClick={() => removePendingImage(idx)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm backdrop-blur-sm"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!editId && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl text-sm flex items-start gap-2 text-blue-700 dark:text-blue-300">
                      <span>💡</span> نصيحة: لن تحفظ الصور حتى تقوم بإضافة المنتج بالكامل.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Validation / Action Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="text-sm font-semibold flex items-center gap-2 mb-4 sm:mb-0">
                {!form.name || !form.price || !form.cost ? (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> 
                    يرجى إكمال الحقول الأساسية (الاسم، سعر البيع، التكلفة)
                  </span>
                ) : (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-4 h-4" /> جاهز للحفظ
                  </span>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setShowModal(false)}>إلغاء</Button>
                <Button variant="primary" className="flex-1 sm:flex-none" icon={<Check className="w-4 h-4" />} onClick={handleSave} loading={saving}>
                  {editId ? 'تحديث المنتج' : 'إضافةالمنتج'}
                </Button>
              </div>
            </div>
`;

content = content.substring(0, startIndex) + modalContent + content.substring(endIndex);

fs.writeFileSync(targetFile, content);
console.log('Modal refactored successfully.');
