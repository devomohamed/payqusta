import React from 'react';
import { LoadingSpinner } from './UI';

function isHlsUrl(url) {
  return /\.m3u8($|\?)/i.test(String(url || ''));
}

function PlayerFallback({ message = 'جاري تحميل البث...' }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-950/70">
      <LoadingSpinner size="sm" text={message} />
    </div>
  );
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
}) {
  const videoRef = React.useRef(null);
  const hlsRef = React.useRef(null);
  const [status, setStatus] = React.useState('loading');

  React.useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;

    if (!video || !url) {
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
        if (isHlsUrl(url)) {
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
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
            hls.loadSource(url);
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
          video.src = url;
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
  }, [url]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;
    video.volume = Math.min(Math.max(volume, 0), 1);

    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [muted, playing, volume, status]);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={{ width, height }}>
      {status === 'loading' && (
        <div className="absolute inset-0 z-10">
          <PlayerFallback />
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-10">
          <PlayerFallback message="تعذر تشغيل البث" />
        </div>
      )}

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
    </div>
  );
}
