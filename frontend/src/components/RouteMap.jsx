import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RouteMap = ({ route, tasks, onTaskClick }) => {
  const { t } = useTranslation('admin');
  const [mapCenter, setMapCenter] = useState({ lat: 30.0444, lng: 31.2357 });

  useEffect(() => {
    if (!tasks?.length) return;

    const validTasks = tasks.filter((task) => task.location?.coordinates);
    if (!validTasks.length) return;

    const avgLat = validTasks.reduce((sum, task) => sum + task.location.coordinates[1], 0) / validTasks.length;
    const avgLng = validTasks.reduce((sum, task) => sum + task.location.coordinates[0], 0) / validTasks.length;
    setMapCenter({ lat: avgLat, lng: avgLng });
  }, [tasks]);

  const pendingTasks = tasks?.filter((task) => ['pending', 'assigned'].includes(task.status)) || [];
  const inProgressTasks = tasks?.filter((task) => ['in-progress', 'visited'].includes(task.status)) || [];
  const completedTasks = tasks?.filter((task) => task.status === 'collected') || [];

  return (
    <div className="app-surface overflow-hidden rounded-xl shadow-lg">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <h3 className="mb-2 text-lg font-bold">{t('route_map.ui.ktrqpok')}</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <span>قيد الانتظار ({pendingTasks.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-blue-400" />
            <span>جاري ({inProgressTasks.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span>تم ({completedTasks.length})</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="relative h-96 w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={48} className="mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">{t('route_map.ui.kscytil')}</p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                {t('route_map.ui.ks7bvjk')}
              </p>
            </div>
          </div>

          <svg className="absolute inset-0 h-full w-full">
            {route?.optimizedOrder && route.optimizedOrder.length > 1 && (
              <polyline
                points={route.optimizedOrder
                  .map((taskId) => {
                    const task = tasks.find((item) => item._id === taskId);
                    if (!task?.location?.coordinates) return null;
                    const x = (task.location.coordinates[0] - mapCenter.lng + 0.1) * 2000;
                    const y = (-task.location.coordinates[1] + mapCenter.lat + 0.1) * 2000;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
              />
            )}

            {tasks?.map((task, index) => {
              if (!task.location?.coordinates) return null;

              const [lng, lat] = task.location.coordinates;
              const x = (lng - mapCenter.lng + 0.1) * 2000;
              const y = (-lat + mapCenter.lat + 0.1) * 2000;

              let color = '#eab308';
              if (task.status === 'collected') color = '#22c55e';
              else if (task.status === 'in-progress' || task.status === 'visited') color = '#3b82f6';

              return (
                <g key={task._id} transform={`translate(${x}, ${y})`}>
                  <circle r="8" fill={color} stroke="white" strokeWidth="2" />
                  <text x="15" y="5" fontSize="12" fill="currentColor">
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto p-4">
        {tasks?.map((task, index) => (
          <div
            key={task._id}
            onClick={() => onTaskClick?.(task)}
            className={`cursor-pointer rounded-lg border p-3 transition ${
              task.status === 'collected'
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : task.status === 'in-progress' || task.status === 'visited'
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                  : 'app-surface-muted border-gray-200/80 dark:border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  task.status === 'collected'
                    ? 'bg-green-500'
                    : task.status === 'in-progress' || task.status === 'visited'
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                }`}
              >
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {task.customer?.name || t('route_map.toasts.kt7bza')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {task.amount?.toLocaleString()} ج.م
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteMap;
