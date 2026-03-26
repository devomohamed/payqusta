import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { MapPin, Plus, Edit2, Trash2, X, Check, Home, Briefcase } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import { confirm } from '../components/ConfirmDialog';

export default function PortalAddresses() {
    const { fetchAddresses, addAddress, updateAddress, deleteAddress } = usePortalStore();
    const { t, i18n } = useTranslation('portal');

    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        label: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        isDefault: false
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const inputClass = "w-full rounded-xl border border-transparent app-surface px-4 py-2.5 text-gray-900 transition focus:border-primary-500/30 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white";

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        setLoading(true);
        const data = await fetchAddresses();
        setAddresses(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);

        let res;
        if (editingId) {
            res = await updateAddress(editingId, formData);
        } else {
            res = await addAddress(formData);
        }

        if (res.success) {
            notify.success(editingId ? t('addresses.update_success') : t('addresses.add_success'));
            setAddresses(res.addresses);
            setModalOpen(false);
            resetForm();
        } else {
            notify.error(res.message);
        }
        setSubmitLoading(false);
    };

    const handleDelete = async (id) => {
        const ok = await confirm.delete(t('addresses.delete_confirm'));
        if (!ok) return;
        const res = await deleteAddress(id);
        if (res.success) {
            notify.success(t('addresses.delete_success'));
            setAddresses(res.addresses);
        } else {
            notify.error(res.message);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            label: '',
            street: '',
            city: '',
            state: '',
            zipCode: '',
            isDefault: false
        });
    };

    const openEdit = (addr) => {
        setEditingId(addr._id);
        setFormData({
            label: addr.label || '',
            street: addr.street,
            city: addr.city,
            state: addr.state || '',
            zipCode: addr.zipCode || '',
            isDefault: addr.isDefault || false
        });
        setModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-20 app-text-soft" dir={i18n.dir()}>
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-primary-500" />
                        {t('addresses.title')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('addresses.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition shadow-lg shadow-primary-500/20"
                >
                    <Plus className="w-4 h-4" />
                    {t('addresses.add')}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : addresses.length === 0 ? (
                <div className="app-surface text-center py-16 rounded-2xl border border-gray-100/80 dark:border-white/10">
                    <div className="app-surface-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">{t('addresses.empty')}</p>
                    <button
                        onClick={() => { resetForm(); setModalOpen(true); }}
                        className="inline-block mt-4 px-6 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition"
                    >
                        {t('addresses.add_new')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                        <div key={addr._id} className={`app-surface rounded-2xl p-4 border transition ${addr.isDefault ? 'border-primary-500 ring-1 ring-primary-500/40' : 'border-gray-100/80 dark:border-white/10'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="app-surface-muted w-10 h-10 rounded-xl flex items-center justify-center">
                                        {addr.label === t('portal_addresses.ui.kove2d7') || addr.label === 'Work' ? <Briefcase className="w-5 h-5 text-gray-400" /> : <Home className="w-5 h-5 text-gray-400" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{addr.label}</h4>
                                        {addr.isDefault && (
                                            <span className="text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full font-bold">
                                                {t('addresses.default')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(addr)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(addr._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 rtl:pr-12 ltr:pl-12">
                                <p>{addr.street}</p>
                                <p>{addr.city} {addr.state && `, ${addr.state}`}</p>
                                {addr.zipCode && <p className="text-gray-400 text-xs">{t('addresses.zip', { code: addr.zipCode })}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="app-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100/80 dark:border-white/10">
                        <div className="p-4 border-b border-gray-100/80 dark:border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary-500" />
                                {editingId ? t('addresses.edit') : t('addresses.add_new')}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="app-surface-muted p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('addresses.label_field')}</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    placeholder={t('addresses.label_placeholder')}
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('addresses.street_field')}</label>
                                <input
                                    type="text"
                                    value={formData.street}
                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                    placeholder={t('addresses.street_placeholder')}
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('addresses.city_field')}</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('addresses.state_field')}</label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('addresses.zip_field', { defaultValue: t('portal_addresses.ui.k5t65xc') })}</label>
                                <input
                                    type="text"
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                    placeholder={t('addresses.zip_placeholder', { defaultValue: t('portal_addresses.ui.kf068gm') })}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('addresses.set_default')}</span>
                                </label>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50"
                                >
                                    {submitLoading ? t('addresses.saving') : (editingId ? t('addresses.update') : t('addresses.save'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
