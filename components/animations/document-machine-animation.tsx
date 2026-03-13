"use client";

export function DocumentMachineAnimation() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <svg
        viewBox="0 0 800 400"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <defs>
          {/* Page template with folded corner */}
          <g id="page">
            {/* Main page body */}
            <rect width="45" height="60" rx="2" className="fill-white dark:fill-zinc-800 stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="1.5"/>
            {/* Folded corner triangle */}
            <path d="M 37 0 L 45 0 L 45 8 Z" className="fill-zinc-300 dark:fill-zinc-600"/>
            <path d="M 37 0 L 45 8" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="1" fill="none"/>
            {/* Text lines */}
            <line x1="8" y1="14" x2="35" y2="14" className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1.5"/>
            <line x1="8" y1="24" x2="35" y2="24" className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1.5"/>
            <line x1="8" y1="34" x2="35" y2="34" className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1.5"/>
            <line x1="8" y1="44" x2="26" y2="44" className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1.5"/>
          </g>

          {/* Reel with spokes for rotation */}
          <g id="reel">
            <circle r="20" className="fill-zinc-700 dark:fill-zinc-300" opacity="0.3"/>
            <circle r="15" className="fill-zinc-200 dark:fill-zinc-800"/>
            <circle r="5" className="fill-zinc-700 dark:fill-zinc-300"/>
            {/* Spokes */}
            <line x1="0" y1="-12" x2="0" y2="12" className="stroke-zinc-600 dark:stroke-zinc-400" strokeWidth="2"/>
            <line x1="-12" y1="0" x2="12" y2="0" className="stroke-zinc-600 dark:stroke-zinc-400" strokeWidth="2"/>
            <line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5" className="stroke-zinc-600 dark:stroke-zinc-400" strokeWidth="2"/>
            <line x1="8.5" y1="-8.5" x2="-8.5" y2="8.5" className="stroke-zinc-600 dark:stroke-zinc-400" strokeWidth="2"/>
          </g>
        </defs>

        {/* Musical staff lines on the right - BEHIND cassette, starting from cassette edge */}
        <g className="stroke-zinc-500 dark:stroke-zinc-500" opacity="0.4">
          <line x1="490" y1="170" x2="750" y2="170" strokeWidth="1"/>
          <line x1="490" y1="185" x2="750" y2="185" strokeWidth="1"/>
          <line x1="490" y1="200" x2="750" y2="200" strokeWidth="1"/>
          <line x1="490" y1="215" x2="750" y2="215" strokeWidth="1"/>
          <line x1="490" y1="230" x2="750" y2="230" strokeWidth="1"/>
        </g>

        {/* Documents entering from left - BEHIND cassette */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="50,170; 230,170; 280,170"
            dur="6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0; 1; 0"
            keyTimes="0; 0.3; 0.5"
            dur="6s"
            repeatCount="indefinite"
          />
          <use href="#page" x="0" y="0" />
        </g>

        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="50,170; 230,170; 280,170"
            dur="6s"
            begin="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0; 1; 0"
            keyTimes="0; 0.3; 0.5"
            dur="6s"
            begin="1.5s"
            repeatCount="indefinite"
          />
          <use href="#page" x="0" y="0" />
        </g>

        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="50,170; 230,170; 280,170"
            dur="6s"
            begin="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0; 1; 0"
            keyTimes="0; 0.3; 0.5"
            dur="6s"
            begin="3s"
            repeatCount="indefinite"
          />
          <use href="#page" x="0" y="0" />
        </g>

        {/* Cassette body */}
        <g transform="translate(400, 200)">
          {/* Main cassette rectangle */}
          <rect
            x="-90"
            y="-60"
            width="180"
            height="120"
            rx="4"
            className="fill-zinc-800 dark:fill-zinc-200 stroke-zinc-700 dark:stroke-zinc-300"
            strokeWidth="2"
          />

          {/* Label area */}
          <rect
            x="-80"
            y="-50"
            width="160"
            height="45"
            rx="2"
            className="fill-zinc-100 dark:fill-zinc-900"
          />

          {/* Label lines */}
          <line x1="-70" y1="-35" x2="70" y2="-35" className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1"/>
          <line x1="-70" y1="-25" x2="70" y2="-25" className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1"/>
          <line x1="-70" y1="-15" x2="40" y2="-15" className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1"/>

          {/* Colored stripe */}
          <rect
            x="-80"
            y="10"
            width="160"
            height="35"
            className="fill-zinc-600 dark:fill-zinc-400"
            opacity="0.5"
          />

          {/* Tape window */}
          <rect
            x="-70"
            y="15"
            width="140"
            height="25"
            rx="2"
            className="fill-zinc-900 dark:fill-zinc-100"
            opacity="0.2"
          />

          {/* Left reel - rotating */}
          <g transform="translate(-45, 27)">
            <use href="#reel">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur="4s"
                repeatCount="indefinite"
              />
            </use>
          </g>

          {/* Right reel - rotating */}
          <g transform="translate(45, 27)">
            <use href="#reel">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur="4s"
                repeatCount="indefinite"
              />
            </use>
          </g>

          {/* Screws in corners */}
          <circle cx="-75" cy="-50" r="2.5" className="fill-zinc-600 dark:fill-zinc-400"/>
          <circle cx="75" cy="-50" r="2.5" className="fill-zinc-600 dark:fill-zinc-400"/>
          <circle cx="-75" cy="50" r="2.5" className="fill-zinc-600 dark:fill-zinc-400"/>
          <circle cx="75" cy="50" r="2.5" className="fill-zinc-600 dark:fill-zinc-400"/>
        </g>

        {/* Musical notes flowing out on staff lines */}
        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0; 0.9; 0.9; 0.5; 0"
            keyTimes="0; 0.15; 0.5; 0.8; 1"
            dur="5s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="500,185; 550,185; 620,185; 690,185; 760,185"
            dur="5s"
            repeatCount="indefinite"
          />
          <text fontSize="32" className="fill-zinc-600 dark:fill-zinc-400">♪</text>
        </g>

        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0; 0.9; 0.9; 0.5; 0"
            keyTimes="0; 0.15; 0.5; 0.8; 1"
            dur="5s"
            begin="0.6s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="500,215; 550,215; 620,215; 690,215; 760,215"
            dur="5s"
            begin="0.6s"
            repeatCount="indefinite"
          />
          <text fontSize="30" className="fill-zinc-600 dark:fill-zinc-400">♫</text>
        </g>

        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0; 0.9; 0.9; 0.5; 0"
            keyTimes="0; 0.15; 0.5; 0.8; 1"
            dur="5s"
            begin="1.2s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="500,170; 550,170; 620,170; 690,170; 760,170"
            dur="5s"
            begin="1.2s"
            repeatCount="indefinite"
          />
          <text fontSize="28" className="fill-zinc-500 dark:fill-zinc-500">♪</text>
        </g>

        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0; 0.9; 0.9; 0.5; 0"
            keyTimes="0; 0.15; 0.5; 0.8; 1"
            dur="5s"
            begin="1.8s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="500,200; 550,200; 620,200; 690,200; 760,200"
            dur="5s"
            begin="1.8s"
            repeatCount="indefinite"
          />
          <text fontSize="31" className="fill-zinc-500 dark:fill-zinc-500">♬</text>
        </g>

        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0; 0.9; 0.9; 0.5; 0"
            keyTimes="0; 0.15; 0.5; 0.8; 1"
            dur="5s"
            begin="2.4s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="500,230; 550,230; 620,230; 690,230; 760,230"
            dur="5s"
            begin="2.4s"
            repeatCount="indefinite"
          />
          <text fontSize="29" className="fill-zinc-600 dark:fill-zinc-400">♪</text>
        </g>

        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0; 0.9; 0.9; 0.5; 0"
            keyTimes="0; 0.15; 0.5; 0.8; 1"
            dur="5s"
            begin="3s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="500,192; 550,192; 620,192; 690,192; 760,192"
            dur="5s"
            begin="3s"
            repeatCount="indefinite"
          />
          <text fontSize="27" className="fill-zinc-500 dark:fill-zinc-500">♫</text>
        </g>
      </svg>

      {/* Text below matching original style */}
      <h1 className="mt-8 bg-gradient-to-br from-black to-zinc-600 bg-clip-text text-center font-mono text-4xl font-bold tracking-tight text-transparent dark:from-white dark:to-zinc-400 sm:text-5xl md:text-6xl lg:text-7xl">
        listen to your documents
      </h1>
    </div>
  );
}
