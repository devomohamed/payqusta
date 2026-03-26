import React, { useState, useEffect } from 'react';
import { Camera, Plus, Trash2, Edit, Save, ExternalLink, RefreshCw, X, Video } from 'lucide-react';
import { Button, Input, Card, Modal, EmptyState, LoadingSpinner } from '../components/UI';
import LazyStreamPlayer from '../components/LazyStreamPlayer';
import toast from 'react-hot-toast';
import { api } from '../store';
import { confirm } from '../components/ConfirmDialog';

export default function CamerasPage() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', type: 'stream' });
  const [playing, setPlaying] = useState(true);

  // Load cameras (stored in Tenant settings)
  const fetchCameras = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/me'); // Get user + tenant
      setCameras(res.data.data.tenant.cameras || []);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل الكاميرات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.url) return toast.error('الاسم والرابط مطلوبين');

    try {
      // Sanitize cameras for backend (Mongoose will fail if _id is not a valid ObjectId)
      const sanitizedCameras = (editingId
        ? cameras.map(c => c._id === editingId ? { ...c, ...form } : c)
        : [...cameras, { ...form }])
        .map(cam => {
          const { _id, ...rest } = cam;
          // If _id is not a valid 24-character hex string (ObjectId), remove it so backend generates one
          if (!_id || !/^[0-9a-fA-F]{24}$/.test(String(_id))) {
            return rest;
          }
          return cam;
        });

      // Send update to backend
      const res = await api.put('/settings/store', { cameras: sanitizedCameras });
      
      // Update local state with returned cameras (which now have real IDs from DB)
      setCameras(res.data.data.tenant.cameras || sanitizedCameras);
      
      toast.success(editingId ? 'تم تعديل الكاميرا' : 'تم إضافة الكاميرا');
      setShowModal(false);
      setForm({ name: '', url: '', type: 'stream' });
      setEditingId(null);
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || 'حدث خطأ في الحفظ');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm.delete('هل أنت متأكد من حذف هذه الكاميرا؟');
    if (!ok) return;
    try {
      const newCameras = cameras.filter(c => c._id !== id);
      const res = await api.put('/settings/store', { cameras: newCameras });
      setCameras(res.data.data.tenant.cameras || newCameras);
      toast.success('تم الحذف');
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-8 h-8 text-primary-500" />
            المراقبة الحية (CCTV)
          </h1>
          <p className="text-gray-500">متابعة الفروع والكاشير مباشرة</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingId(null); setForm({ name: '', url: '', type: 'stream' }); setShowModal(true); }}>
          إضافة كاميرا
        </Button>
      </div>

      {loading ? (
        <Card className="p-6 sm:p-8">
          <LoadingSpinner size="lg" text="جاري تحميل الكاميرات..." />
        </Card>
      ) : cameras.length === 0 ? (
        <EmptyState
          icon={<Video className="w-12 h-12" />}
          title="لا توجد كاميرات مضافة"
          description="أضف روابط الكاميرات لمتابعة العمل مباشرة"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cameras.map((cam) => (
            <Card key={cam._id} className="overflow-hidden group">
              <div className="aspect-video bg-black relative">
                {cam.type === 'embed' ? (
                  <iframe
                    src={cam.url}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <LazyStreamPlayer
                    url={cam.url}
                    type={cam.type === 'mjpeg' ? 'mjpeg' : 'auto'}
                    width="100%"
                    height="100%"
                    playing={playing}
                    controls
                    volume={0} // Muted by default for auto play
                  />
                )}

                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(cam._id); setForm(cam); setShowModal(true); }} className="p-1.5 bg-black/50 text-white rounded hover:bg-black/70">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cam._id)} className="p-1.5 bg-red-500/80 text-white rounded hover:bg-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="absolute top-2 left-2">
                  <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                </div>
              </div>
              <div className="p-3 border-t dark:border-gray-800">
                <h3 className="font-bold text-sm">{cam.name}</h3>
                <p className="text-xs text-gray-500 truncate" title={cam.url}>{cam.url}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'تعديل كاميرا' : 'إضافة كاميرا جديدة'} size="sm">
        <div className="space-y-4">
          <Input label="اسم الكاميرا / الفرع" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: الكاشير - فرع القاهرة" />

          <div>
            <label className="block text-sm font-bold mb-1">نوع الرابط</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.type === 'stream' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'border-gray-200 dark:border-gray-800'}`}
                onClick={() => setForm({ ...form, type: 'stream' })}
              >
                HLS / MP4
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.type === 'mjpeg' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'border-gray-200 dark:border-gray-800'}`}
                onClick={() => setForm({ ...form, type: 'mjpeg' })}
              >
                IP Camera (MJPEG)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.type === 'embed' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'border-gray-200 dark:border-gray-800'}`}
                onClick={() => setForm({ ...form, type: 'embed' })}
              >
                تضمين (Embed)
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
              * <b>HLS / MP4</b>: للروابط التي تنتهي بـ .m3u8 أو .mp4<br />
              * <b>MJPEG</b>: لكاميرات الـ IP المباشرة (مثل TRENDnet, DLink)<br />
              * <b>تضمين</b>: لروابط YouTube Live أو الصفحات الخارجية.
            </p>
          </div>

          <Input label="رابط البث (URL)" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." dir="ltr" />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
