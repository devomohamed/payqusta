import React, { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, Loader } from 'lucide-react';
import { api, productsApi } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';
import { useTranslation } from 'react-i18next';

export default function SettingsCategories() {
  const { t } = useTranslation('admin');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const [settingsRes, productsRes] = await Promise.all([
        api.get('/settings'),
        productsApi.getCategories(),
      ]);

      const settingsCategories = settingsRes.data?.data?.tenant?.settings?.categories || [];
      const settingsNames = settingsCategories
        .map((category) => (typeof category === 'string' ? category : category?.name))
        .filter(Boolean);

      const productCategories = productsRes.data?.data || [];
      setCategories(Array.from(new Set([...settingsNames, ...productCategories])));
    } catch (error) {
      notify.error(t('settings_categories.toasts.kaf56sp'));
    } finally {
      setLoading(false);
    }
  };

  const saveCategories = async (updatedCategories) => {
    setSaving(true);
    try {
      await api.put('/settings/categories', { categories: updatedCategories });
      notify.success(t('settings_categories.toasts.kjrxjsq'));
    } catch (error) {
      notify.error(t('settings_categories.toasts.kbtcvi5'));
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      notify.warning(t('settings_categories.toasts.ktm1ctc'));
      return;
    }

    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCategory('');
    saveCategories(updated);
  };

  const removeCategory = (category) => {
    notify.custom({
      type: 'warning',
      title: t('settings_categories.ui.kdbi5jf'),
      message: `هل أنت متأكد من حذف قسم "${category}"؟ سيتم نقل المنتجات المرتبطة به إلى قسم "أخرى".`,
      action: {
        label: t('settings_categories.ui.kcuf6ig'),
        onClick: async () => {
          setSaving(true);
          try {
            await api.delete(`/settings/categories/${encodeURIComponent(category)}`);
            setCategories((prev) => prev.filter((item) => item !== category));
            notify.success(t('settings_categories.toasts.ko0gg78'));
          } catch (error) {
            notify.error(t('settings_categories.toasts.k2u80pf'));
          } finally {
            setSaving(false);
          }
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
          <Tag className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{t('settings_categories.ui.k5wqg29')}</h2>
          <p className="text-sm text-gray-400">{t('settings_categories.ui.kmhq2nr')}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder={t('settings_categories.placeholders.kst6xwn')}
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyPress={(event) => event.key === 'Enter' && addCategory()}
            disabled={loading || saving}
          />
        </div>
        <Button
          onClick={addCategory}
          disabled={loading || saving || !newCategory.trim()}
          icon={saving ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        >
          {saving ? t('settings_categories.ui.kuyp1dc') : 'إضافة'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, index) => (
            <div key={index} className="app-surface flex items-center justify-between rounded-xl border border-gray-100/80 p-3 transition-shadow hover:shadow-md dark:border-white/10 group">
              <span className="font-medium text-gray-700 dark:text-gray-200">{category}</span>
              <button
                onClick={() => removeCategory(category)}
                disabled={saving}
                className="rounded-lg p-1.5 text-red-500 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                title={t('settings_categories.titles.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="app-surface-muted col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/80 py-12 text-gray-400 dark:border-white/10">
              <Tag className="mb-3 h-12 w-12 opacity-20" />
              <p>{t('settings_categories.ui.k59icpg')}</p>
              <p className="mt-1 text-xs opacity-70">{t('settings_categories.ui.kzh03ik')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
