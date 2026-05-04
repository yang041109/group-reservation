'use client';

interface UrrLoadingProps {
  message?: string;
}

export default function UrrLoading({ message = '불러오는 중...' }: UrrLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <svg width="200" height="80" viewBox="0 0 200 80" className="urr-loading">
          <defs>
            <linearGradient id="fillGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="1">
                <animate attributeName="offset" values="0;1;0" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="1">
                <animate attributeName="offset" values="0.5;1.5;0.5" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0">
                <animate attributeName="offset" values="1;2;1" dur="2s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <text
            x="100"
            y="55"
            fontSize="48"
            fontWeight="bold"
            textAnchor="middle"
            fill="url(#fillGradient)"
            stroke="#e0f2fe"
            strokeWidth="2"
          >
            URR
          </text>
        </svg>
      </div>
      {message && <p className="mt-4 text-sm text-gray-500">{message}</p>}
    </div>
  );
}
