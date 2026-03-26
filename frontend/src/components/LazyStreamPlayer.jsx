import React from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from './UI';
import { API_URL } from '../store';

function isHlsUrl(url) {
  return /\.m3u8($|\?)/i.test(String(url || ''));
}

function PlayerFallback({ message }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-950/70">
      <LoadingSpinner size="sm" text={message} />
    </div>
  );
}

function isMjpegUrl(url) {
  return /\.(mjpg|mjpeg)($|\?)/i.test(String(url || '')) || url.includes('video.mjpg') || url.includes('mjpg.cgi');
}

export default function LazyStreamPlayer({
  url,
  width = '100%',
  height = '100%',
  playing = false,
  controls = true,
  muted = false,
  volume = 1,
  className = '',
  poster,
  playsInline = true,
  type = 'auto', // Add type prop to explicitly set player mode
}) {
  const { t } = useTranslation('admin');
  const videoRef = React.useRef(null);
  const hlsRef = React.useRef(null);
  const [status, setStatus] = React.useState('loading');

  const proxiedUrl = React.useMemo(() => {
    if (!url) return '';
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpStream = url.startsWith('http:');

    if (isHttps && isHttpStream) {
      return `${API_URL}/settings/cameras/proxy?url=${encodeURIComponent(url)}&t=${Date.now()}`;
    }
    return url;
  }, [url]);

  const isMjpeg = type === 'mjpeg' || (type === 'auto' && isMjpegUrl(url));

  React.useEffect(() => {
    if (isMjpeg) {
      setStatus('ready');
      return;
    }

    let cancelled = false;
    const video = videoRef.current;

    if (!video || !proxiedUrl) {
      setStatus('error');
      return undefined;
    }

    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute('src');
      video.load();
    };

    const attachSource = async () => {
      setStatus('loading');
      cleanup();

      try {
        if (isHlsUrl(proxiedUrl)) {
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = proxiedUrl;
          } else {
            const { default: Hls } = await import('hls.js/light');
            if (cancelled) return;

            if (!Hls.isSupported()) {
              throw new Error('HLS is not supported in this browser');
            }

            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });

            hlsRef.current = hls;
            hls.loadSource(proxiedUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (!cancelled) {
                setStatus('ready');
              }
            });
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data?.fatal && !cancelled) {
                setStatus('error');
              }
            });
            return;
          }
        } else {
          video.src = proxiedUrl;
        }

        if (!cancelled) {
          setStatus('ready');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize stream player', error);
          setStatus('error');
        }
      }
    };

    attachSource();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [proxiedUrl, isMjpeg]);

  React.useEffect(() => {
    if (isMjpeg) return;

    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;
    video.volume = Math.min(Math.max(volume, 0), 1);

    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [muted, playing, volume, status, isMjpeg]);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={{ width, height }}>
      {status === 'loading' && (
        <div className="absolute inset-0 z-10">
          <PlayerFallback message={t('stream_player.loading')} />
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-10">
          <PlayerFallback message={t('stream_player.error')} />
        </div>
      )}

      {isMjpeg ? (
        <img
          src={proxiedUrl}
          alt="Camera Stream"
          className="h-full w-full object-contain"
          onError={() => setStatus('error')}
          onLoad={() => setStatus('ready')}
        />
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full"
          controls={controls}
          muted={muted}
          playsInline={playsInline}
          poster={poster}
          autoPlay={playing}
          onCanPlay={() => setStatus((current) => (current === 'error' ? current : 'ready'))}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}
