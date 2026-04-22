import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Mountain silhouette using SVG path */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: 'flex' }}
        >
          <path d="M12 2L2 22h20L12 2z" fill="white" />
        </svg>
      </div>
    ),
    size,
  );
}
