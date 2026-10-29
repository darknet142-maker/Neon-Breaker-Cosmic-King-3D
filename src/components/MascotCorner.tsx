import React from 'react';
import { MascotMood } from '../game/types';

interface MascotCornerProps {
  mood: MascotMood;
  message: string;
  onClickMascot: () => void;
}

export const MascotCorner: React.FC<MascotCornerProps> = ({
  mood,
  message,
  onClickMascot,
}) => {
  return (
    <div
      className="fixed -right-3 -bottom-3 sm:right-2 sm:bottom-2 z-20 flex flex-col items-end pointer-events-none select-none"
      aria-live="polite"
    >
      {/* Speech Bubble Toast (Visible on Desktop or during special events) */}
      <div className="mr-4 sm:mr-6 mb-1 px-3 py-1 rounded-xl border border-[#FF4098]/60 bg-[#140934] text-[11px] sm:text-xs font-bold text-[#FFD1E6] shadow-[0_4px_14px_rgba(0,0,0,0.75)] whitespace-nowrap">
        {message}
      </div>

      {/* Crowned Pink Kawaii Mascot Matching the Bottom-Right of the Screenshot */}
      <button
        onClick={onClickMascot}
        title="Roi Cosmique Kawaii — Cliquez pour un encouragement !"
        className="pointer-events-auto relative w-32 h-32 sm:w-40 sm:h-40 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
      >
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full overflow-visible">
          {/* Excitement Rays on the Left of the Mascot (Matching screenshot's 3 golden-pink lines) */}
          <g className={mood === 'ecstatic' || mood === 'cheering' ? 'opacity-100' : 'opacity-70'}>
            <path
              d="M36 62L18 46"
              stroke="#FFB84D"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M28 88L8 82"
              stroke="#FF85A2"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M32 112L12 114"
              stroke="#FF85A2"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
          </g>

          {/* Left Little Ear / Arm */}
          <ellipse
            cx="48"
            cy="132"
            rx="14"
            ry="10"
            transform="rotate(-28 48 132)"
            fill="#E01260"
            stroke="#230820"
            strokeWidth="4.5"
          />

          {/* Main Glossy 3D Pink Sphere Body */}
          <circle
            cx="118"
            cy="126"
            r="66"
            fill="url(#mascotBodyGrad)"
            stroke="#230820"
            strokeWidth="5.5"
          />

          {/* Top-Left Specular Candy Highlight on Mascot Head */}
          <path
            d="M72 92C80 76 96 67 114 66"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Rosy Cheeks */}
          <ellipse
            cx="74"
            cy="128"
            rx="11"
            ry="6.5"
            transform="rotate(-12 74 128)"
            fill="#FF75B5"
            opacity="0.75"
          />
          <ellipse
            cx="158"
            cy="112"
            rx="11"
            ry="6.5"
            transform="rotate(-12 158 112)"
            fill="#FF75B5"
            opacity="0.75"
          />

          {/* Expressive Eyes based on Mood */}
          {mood === 'worried' ? (
            <>
              <circle cx="88" cy="112" r="9" fill="#230820" />
              <circle cx="85" cy="109" r="3.5" fill="#FFFFFF" />
              <circle cx="138" cy="102" r="9" fill="#230820" />
              <circle cx="135" cy="99" r="3.5" fill="#FFFFFF" />
            </>
          ) : (
            <>
              {/* Joyful Arched Eyes ^  ^ tilted slightly like screenshot */}
              <path
                d="M74 116C78 100 94 98 102 111"
                stroke="#230820"
                strokeWidth="8.5"
                strokeLinecap="round"
              />
              <path
                d="M128 104C132 88 148 86 156 99"
                stroke="#230820"
                strokeWidth="8.5"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Tiny Cute Nose Dot */}
          <circle cx="115" cy="111" r="3.2" fill="#230820" />

          {/* Big Joyful Laughing Mouth with Pink Tongue */}
          {mood === 'worried' ? (
            <path
              d="M102 142C112 132 128 132 136 140"
              stroke="#230820"
              strokeWidth="6"
              strokeLinecap="round"
            />
          ) : (
            <g transform="rotate(-10 120 138)">
              <path
                d="M86 128C86 128 118 118 152 126C154 156 136 174 116 174C96 174 84 156 86 128Z"
                fill="#3B0722"
                stroke="#230820"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              {/* Tongue inside mouth */}
              <path
                d="M98 156C104 142 128 140 140 154C134 168 124 172 116 172C108 172 101 166 98 156Z"
                fill="#FF2A78"
              />
            </g>
          )}

          {/* Golden Royal Crown Tilted on Top-Left of Mascot Head */}
          <g transform="translate(52, 16) rotate(-18)">
            <path
              d="M10 56L4 22L28 36L46 10L64 36L88 22L82 56H10Z"
              fill="url(#mascotCrownGrad)"
              stroke="#230820"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <rect
              x="8"
              y="52"
              width="76"
              height="11"
              rx="5.5"
              fill="#F59E0B"
              stroke="#230820"
              strokeWidth="4"
            />
            {/* Crown Pearls on Tips */}
            <circle cx="4" cy="18" r="6" fill="#FFE866" stroke="#230820" strokeWidth="3.5" />
            <circle cx="46" cy="7" r="7" fill="#FFE866" stroke="#230820" strokeWidth="3.5" />
            <circle cx="88" cy="18" r="6" fill="#FFE866" stroke="#230820" strokeWidth="3.5" />
          </g>

          <defs>
            <radialGradient
              id="mascotBodyGrad"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(96 96) rotate(45) scale(95)"
            >
              <stop stopColor="#FF5CA8" />
              <stop offset="0.55" stopColor="#FF1668" />
              <stop offset="1" stopColor="#9E0038" />
            </radialGradient>
            <linearGradient
              id="mascotCrownGrad"
              x1="46"
              y1="8"
              x2="46"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FFF078" />
              <stop offset="0.55" stopColor="#FFB800" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      </button>
    </div>
  );
};
